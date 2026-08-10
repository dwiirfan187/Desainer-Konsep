/**
 * lib/ai-provider.ts
 *
 * Satu-satunya tempat di codebase yang boleh memanggil AI API secara langsung.
 *
 * Strategi provider:
 *  1. Google Gemini (PRIMARY)  — GEMINI_API_KEY
 *  2. OpenAI GPT (FALLBACK)    — OPENAI_API_KEY
 *
 * Jika Gemini gagal karena alasan apapun (rate limit, quota, network error,
 * response tidak valid), sistem otomatis retry ke OpenAI tanpa membutuhkan
 * intervensi manual.
 *
 * Setiap call di-log ke console dengan provider yang berhasil — berguna untuk
 * debugging biaya dan quota.
 *
 * Usage:
 *   import { callAI } from "@/lib/ai-provider";
 *   const text = await callAI({ systemPrompt, userPrompt, maxTokens });
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AICallOptions {
  /** System prompt — instruksi peran dan format output untuk model */
  systemPrompt: string;
  /** User prompt — input spesifik untuk request ini */
  userPrompt: string;
  /**
   * Batas maksimum token output.
   * Default: 2048. Generate prompt butuh lebih banyak — pakai 3000+.
   */
  maxTokens?: number;
}

export interface AICallResult {
  /** Teks raw dari model — belum di-parse */
  text: string;
  /** Provider yang berhasil menjawab */
  provider: "gemini" | "openai";
}

// ---------------------------------------------------------------------------
// Gemini API caller (PRIMARY)
// ---------------------------------------------------------------------------

async function callGemini(opts: Required<AICallOptions>): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY tidak tersedia");

  // Gemini 3.6 Flash — model Flash GA terbaru (Agustus 2026)
  const model = "gemini-3.6-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: opts.systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: opts.userPrompt }],
        },
      ],
      generationConfig: {
        maxOutputTokens: opts.maxTokens,
        // temperature deprecated di Gemini 3.x — tidak dikirim agar tidak 400
        // Minta response JSON agar mudah di-parse — didukung Gemini 2.5+
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();

  // Gemini response structure: candidates[0].content.parts[0].text
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") {
    // Cek apakah ada finish reason yang menjelaskan kegagalan
    const finishReason = data?.candidates?.[0]?.finishReason;
    throw new Error(
      `Gemini response kosong atau tidak valid. finishReason: ${finishReason ?? "unknown"}`
    );
  }

  return text;
}

// ---------------------------------------------------------------------------
// OpenAI API caller (FALLBACK)
// ---------------------------------------------------------------------------

async function callOpenAI(opts: Required<AICallOptions>): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY tidak tersedia");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: opts.maxTokens,
      temperature: 0.85,
      // response_format json_object memastikan output selalu valid JSON
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: opts.userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    throw new Error("OpenAI response kosong atau tidak valid");
  }

  return text;
}

// ---------------------------------------------------------------------------
// Main export: callAI — Gemini primary, OpenAI fallback
// ---------------------------------------------------------------------------

/**
 * Panggil AI dengan Gemini sebagai primary provider.
 * Jika Gemini gagal karena alasan apapun, otomatis fallback ke OpenAI.
 *
 * Throw Error hanya jika KEDUA provider gagal.
 */
export async function callAI(opts: AICallOptions): Promise<AICallResult> {
  const resolved: Required<AICallOptions> = {
    systemPrompt: opts.systemPrompt,
    userPrompt: opts.userPrompt,
    maxTokens: opts.maxTokens ?? 2048,
  };

  // ── TAHAP 1: Coba Gemini ──────────────────────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      const text = await callGemini(resolved);
      console.log(`[ai-provider] ✓ Gemini berhasil (maxTokens: ${resolved.maxTokens})`);
      return { text, provider: "gemini" };
    } catch (geminiErr) {
      const errMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
      console.warn(`[ai-provider] ✗ Gemini gagal: ${errMsg}`);
      console.log("[ai-provider] → Fallback ke OpenAI…");
    }
  } else {
    console.log("[ai-provider] GEMINI_API_KEY tidak ada, langsung ke OpenAI");
  }

  // ── TAHAP 2: Fallback ke OpenAI ───────────────────────────────────────────
  if (process.env.OPENAI_API_KEY) {
    try {
      const text = await callOpenAI(resolved);
      console.log(`[ai-provider] ✓ OpenAI berhasil (maxTokens: ${resolved.maxTokens})`);
      return { text, provider: "openai" };
    } catch (openaiErr) {
      const errMsg = openaiErr instanceof Error ? openaiErr.message : String(openaiErr);
      console.error(`[ai-provider] ✗ OpenAI juga gagal: ${errMsg}`);
      throw new Error(`Semua AI provider gagal. Terakhir: ${errMsg}`);
    }
  }

  // Tidak ada key sama sekali
  throw new Error(
    "Tidak ada AI API key yang dikonfigurasi. Set GEMINI_API_KEY atau OPENAI_API_KEY di .env.local"
  );
}
