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
// Gemini models — urutan prioritas
// ---------------------------------------------------------------------------

const GEMINI_MODELS = [
  "gemini-3.6-flash",   // primary — terbaru
  "gemini-3.5-flash",   // fallback — lebih stabil
];

// ---------------------------------------------------------------------------
// Single Gemini caller — pakai apiKey yang diberikan
// ---------------------------------------------------------------------------

async function callGeminiWithKey(
  opts: Required<Pick<AICallOptions, "systemPrompt" | "userPrompt" | "maxTokens">>,
  apiKey: string
): Promise<string> {
  // Coba tiap model secara berurutan — kalau 503 lanjut ke model berikutnya
  let lastError = "";

  for (const model of GEMINI_MODELS) {
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
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      lastError = `${model} error ${res.status}: ${body.slice(0, 200)}`;
      console.warn(`[ai-provider] ✗ ${model} gagal: ${res.status} — coba model berikutnya`);
      continue; // coba model berikutnya
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== "string") {
      const finishReason = data?.candidates?.[0]?.finishReason;
      lastError = `${model} response kosong. finishReason: ${finishReason ?? "unknown"}`;
      console.warn(`[ai-provider] ✗ ${model} response kosong — coba model berikutnya`);
      continue;
    }

    console.log(`[ai-provider] ✓ ${model} berhasil`);
    return text;
  }

  throw new Error(`Semua model gagal. Error terakhir: ${lastError}`);
}

// ---------------------------------------------------------------------------
// Main export: callAI — chain 4 Gemini key
// ---------------------------------------------------------------------------

export async function callAI(opts: AICallOptions): Promise<AICallResult> {
  const maxTokens = opts.maxTokens ?? 2048;
  const primaryKeyEnv = opts.geminiKeyEnv ?? "GEMINI_API_KEY";

  // Urutan fallback key — maksimal 2 key dicoba untuk hemat quota.
  // KEY_3 dan KEY_4 hanya dipakai kalau key utama benar-benar gagal permanen.
  const fallbackOrder: string[] =
    primaryKeyEnv === "GEMINI_API_KEY"
      ? ["GEMINI_API_KEY", "GEMINI_API_KEY_3"]
      : ["GEMINI_API_KEY_2", "GEMINI_API_KEY_4"];

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

      // Kalau 429 (quota habis) — STOP, jangan coba key lain yang mungkin juga habis
      // karena semua key dari project berbeda punya quota sendiri,
      // tapi model yang sama tetap kena rate limit global
      if (errMsg.includes("429")) {
        console.warn(`[ai-provider] ✗ ${keyEnv} quota habis (429) — berhenti retry`);
        throw new Error(
          "Quota Gemini habis untuk saat ini. Coba lagi dalam beberapa menit ya."
        );
      }

      // Kalau 503 (model overload) — coba key berikutnya
      console.warn(`[ai-provider] ✗ ${keyEnv} gagal: ${errMsg.slice(0, 100)} — coba key berikutnya`);
    }
  }

  // Semua key gagal
  throw new Error(
    "Lagi gagal connect ke AI-nya, coba generate ulang ya."
  );
}
