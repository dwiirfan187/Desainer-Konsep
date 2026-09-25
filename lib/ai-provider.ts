/**
 * lib/ai-provider.ts
 *
 * Satu-satunya tempat di codebase yang boleh memanggil AI API secara langsung.
 *
 * Strategi provider — chain 4 Gemini API key:
 *   GEMINI_API_KEY   → generate-concept (primary)
 *   GEMINI_API_KEY_2 → generate-prompt (primary)
 *   GEMINI_API_KEY_3 → fallback pertama (kalau key yang dipilih gagal)
 *   GEMINI_API_KEY_4 → fallback kedua
 *
 * Tiap key dari Google Cloud project berbeda — quota terpisah.
 * Kalau semua key gagal, throw error ke user.
 *
 * Usage:
 *   import { callAI } from "@/lib/ai-provider";
 *   const text = await callAI({ systemPrompt, userPrompt, maxTokens, geminiKeyEnv });
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
  /**
   * Env var Gemini API key utama yang dipakai.
   * Default: "GEMINI_API_KEY".
   * Pakai "GEMINI_API_KEY_2" untuk generate-prompt.
   */
  geminiKeyEnv?: "GEMINI_API_KEY" | "GEMINI_API_KEY_2";
}

export interface AICallResult {
  /** Teks raw dari model — belum di-parse */
  text: string;
  /** Provider yang berhasil menjawab */
  provider: "gemini";
  /** Key env var yang berhasil dipakai */
  keyUsed: string;
}

// ---------------------------------------------------------------------------
// Gemini model
// ---------------------------------------------------------------------------

const GEMINI_MODEL = "gemini-3.6-flash";

// ---------------------------------------------------------------------------
// Single Gemini caller — pakai apiKey yang diberikan
// ---------------------------------------------------------------------------

async function callGeminiWithKey(
  opts: Required<Pick<AICallOptions, "systemPrompt" | "userPrompt" | "maxTokens">>,
  apiKey: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

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
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") {
    const finishReason = data?.candidates?.[0]?.finishReason;
    throw new Error(
      `Gemini response kosong atau tidak valid. finishReason: ${finishReason ?? "unknown"}`
    );
  }

  return text;
}

// ---------------------------------------------------------------------------
// Main export: callAI — chain 4 Gemini key
// ---------------------------------------------------------------------------

export async function callAI(opts: AICallOptions): Promise<AICallResult> {
  const maxTokens = opts.maxTokens ?? 2048;
  const primaryKeyEnv = opts.geminiKeyEnv ?? "GEMINI_API_KEY";

  // Urutan fallback:
  // 1. Key utama yang dipilih (KEY_1 atau KEY_2)
  // 2. KEY_3 (fallback pertama)
  // 3. KEY_4 (fallback kedua)
  // 4. Key utama lainnya (KEY_2 atau KEY_1) sebagai last resort
  const fallbackOrder: string[] =
    primaryKeyEnv === "GEMINI_API_KEY"
      ? ["GEMINI_API_KEY", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4", "GEMINI_API_KEY_2"]
      : ["GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4", "GEMINI_API_KEY"];

  const baseOpts = { systemPrompt: opts.systemPrompt, userPrompt: opts.userPrompt, maxTokens };

  for (const keyEnv of fallbackOrder) {
    const apiKey = process.env[keyEnv];

    if (!apiKey) {
      console.log(`[ai-provider] ${keyEnv} tidak ada, skip`);
      continue;
    }

    try {
      const text = await callGeminiWithKey(baseOpts, apiKey);
      console.log(`[ai-provider] ✓ Gemini berhasil via ${keyEnv}`);
      return { text, provider: "gemini", keyUsed: keyEnv };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[ai-provider] ✗ ${keyEnv} gagal: ${errMsg}`);
      // Lanjut ke key berikutnya
    }
  }

  // Semua key gagal
  throw new Error(
    "Semua Gemini API key gagal. Kemungkinan semua quota habis atau model sedang down. Coba lagi nanti."
  );
}
