/**
 * ai-prompt-engine.ts
 *
 * Semua logic yang berkaitan dengan AI prompt engineering ada di sini:
 * - System prompt untuk generate konsep desain
 * - Builder yang merangkai brief → prompt string
 * - Parser untuk JSON response dari AI
 * - Type definitions output
 *
 * Dipisah supaya bisa di-iterasi independen tanpa menyentuh API route (PRD §12).
 */

import type { BriefFormValues, DesignType } from "@/lib/brief-schema";

// ---------------------------------------------------------------------------
// Output types — struktur yang diharapkan dari AI
// ---------------------------------------------------------------------------

export interface GeneratedConcept {
  title: string;
  description: string;
  /** Array 3–5 hex color, mis. ["#3B5EFF", "#FFB100", "#FF5C7A"] */
  color_palette: string[];
  /** Referensi teknik/gaya desain nyata, mis. "risograph print", "swiss grid" */
  style_reference: string;
}

export interface GenerateConceptResponse {
  concepts: GeneratedConcept[];
}

// ---------------------------------------------------------------------------
// Label mapping untuk display yang lebih deskriptif di prompt
// ---------------------------------------------------------------------------

const DESIGN_TYPE_LABELS: Record<DesignType, string> = {
  poster: "poster event / promosi",
  feed: "feed / story Instagram",
  logo: "logo & identitas visual",
  banner: "banner promosi digital",
};

// ---------------------------------------------------------------------------
// SYSTEM PROMPT — inti dari "anti-AI-look" prompt engineering (PRD §5.3.1)
// ---------------------------------------------------------------------------

export const CONCEPT_SYSTEM_PROMPT = `Kamu adalah seorang art director senior di studio desain grafis kreatif Indonesia. Keahlianmu adalah brainstorming konsep visual yang kuat, spesifik, dan punya kepribadian — bukan konsep generik yang "aman".

TUGAS:
Berikan 3–5 konsep desain grafis alternatif berdasarkan brief yang diberikan. Tiap konsep harus terasa BERBEDA satu sama lain — bukan variasi tipis dari satu ide yang sama.

ATURAN KONSEP YANG BAIK:
1. Setiap konsep harus punya ARAH VISUAL yang jelas dan spesifik — bukan deskripsi ambigu seperti "modern dan clean".
2. Referensikan teknik desain nyata: risograph print, swiss international typographic style, cut-paper collage, woodblock print, halftone offset, bauhaus grid, editorial magazine layout, Japanese retro advertising, dll.
3. Palet warna harus purposeful — jelaskan KENAPA warna itu dipilih, bukan asal menyebut warna.
4. Hindari buzzword generik: "vibrant", "eye-catching", "professional", "modern", "clean", "elegant" tanpa konteks spesifik.
5. Sisipkan elemen imperfection yang disengaja jika relevan: slight misregistration, paper texture, grain film, komposisi asimetris — ini yang membuat hasil terasa buatan tangan, bukan AI.

FORMAT RESPONSE:
Kembalikan HANYA JSON valid (tanpa markdown, tanpa backtick, tanpa komentar), dengan struktur persis seperti ini:
{
  "concepts": [
    {
      "title": "Nama konsep singkat (3–6 kata)",
      "description": "Deskripsi gaya visual 2–3 kalimat. Harus menyebutkan: komposisi utama, mood/atmosfer, dan elemen visual yang paling khas dari konsep ini.",
      "color_palette": ["#HEXCODE", "#HEXCODE", "#HEXCODE", "#HEXCODE"],
      "style_reference": "Satu referensi teknik/gaya desain spesifik (contoh: 'risograph two-color print', 'swiss grid typography', 'japanese retro poster 1970s')"
    }
  ]
}

PENTING:
- color_palette harus berisi 3–5 hex code valid (format #RRGGBB)
- Jumlah konsep: antara 3 sampai 5, pilih berdasarkan kekayaan brief yang diberikan
- Jangan tambahkan field lain di luar struktur di atas
- Jangan bungkus JSON dengan markdown code block`;

// ---------------------------------------------------------------------------
// Builder: brief values → user prompt string
// ---------------------------------------------------------------------------

export function buildUserPrompt(brief: BriefFormValues): string {
  const lines: string[] = [];

  lines.push(`BRIEF DESAIN:`);
  lines.push(`- Jenis desain: ${DESIGN_TYPE_LABELS[brief.design_type as DesignType]}`);
  lines.push(`- Topik/tema: ${brief.topic.trim()}`);
  lines.push(`- Mood/vibe: ${brief.mood_tags.join(", ")}`);

  if (brief.target_audience?.trim()) {
    lines.push(`- Target audiens: ${brief.target_audience.trim()}`);
  }

  if (brief.color_preference?.trim()) {
    lines.push(`- Preferensi warna: ${brief.color_preference.trim()}`);
  }

  if (brief.extra_notes?.trim()) {
    lines.push(`- Catatan tambahan: ${brief.extra_notes.trim()}`);
  }

  lines.push(``);
  lines.push(`Berikan 3–5 konsep desain yang beragam dan kuat berdasarkan brief di atas.`);

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Parser: raw string AI response → typed GenerateConceptResponse
// Robust terhadap response yang dibungkus markdown atau ada whitespace
// ---------------------------------------------------------------------------

export function parseConceptResponse(raw: string): GenerateConceptResponse {
  // Bersihkan markdown code block jika ada (model kadang tetap bungkus meski diperintah tidak)
  let cleaned = raw.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`AI response bukan JSON valid. Raw: ${raw.slice(0, 300)}`);
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("concepts" in parsed) ||
    !Array.isArray((parsed as Record<string, unknown>).concepts)
  ) {
    throw new Error(`Struktur JSON tidak sesuai. Parsed: ${JSON.stringify(parsed).slice(0, 300)}`);
  }

  const raw_concepts = (parsed as { concepts: unknown[] }).concepts;

  const concepts: GeneratedConcept[] = raw_concepts.map((c, i) => {
    if (typeof c !== "object" || c === null) {
      throw new Error(`Konsep ke-${i} bukan object`);
    }
    const concept = c as Record<string, unknown>;

    if (typeof concept.title !== "string" || !concept.title.trim()) {
      throw new Error(`Konsep ke-${i} tidak punya title`);
    }
    if (typeof concept.description !== "string" || !concept.description.trim()) {
      throw new Error(`Konsep ke-${i} tidak punya description`);
    }
    if (!Array.isArray(concept.color_palette) || concept.color_palette.length < 2) {
      throw new Error(`Konsep ke-${i} color_palette tidak valid`);
    }
    if (typeof concept.style_reference !== "string" || !concept.style_reference.trim()) {
      throw new Error(`Konsep ke-${i} tidak punya style_reference`);
    }

    // Sanitasi hex colors — pastikan format #RRGGBB
    const palette = (concept.color_palette as unknown[])
      .filter((h): h is string => typeof h === "string")
      .map((h) => {
        const hex = h.trim().toUpperCase();
        return /^#[0-9A-F]{6}$/.test(hex) ? hex : null;
      })
      .filter((h): h is string => h !== null);

    if (palette.length < 2) {
      throw new Error(`Konsep ke-${i} punya warna tidak valid: ${JSON.stringify(concept.color_palette)}`);
    }

    return {
      title: concept.title.trim(),
      description: concept.description.trim(),
      color_palette: palette,
      style_reference: concept.style_reference.trim(),
    };
  });

  if (concepts.length < 1) {
    throw new Error("Tidak ada konsep yang berhasil di-parse");
  }

  return { concepts };
}

// ---------------------------------------------------------------------------
// Helper: tilt value yang deterministik dari index
// Supaya tiap generate ulang kartu punya tilt konsisten, bukan random (§1.4)
// ---------------------------------------------------------------------------

export function getTiltForIndex(index: number): -2 | -1 | 0 | 1 | 2 {
  const tilts: (-2 | -1 | 0 | 1 | 2)[] = [-2, 1, -1, 2, 0];
  return tilts[index % tilts.length];
}

// ---------------------------------------------------------------------------
// Helper: ambil warna dominan dari palet (warna pertama yang bukan putih/hitam)
// ---------------------------------------------------------------------------

export function getDominantColor(palette: string[]): string {
  const neutrals = new Set(["#FFFFFF", "#000000", "#FAF7FF", "#1A1A2E", "#F5F5F5", "#FAFAFA"]);
  return palette.find((h) => !neutrals.has(h.toUpperCase())) ?? palette[0] ?? "#3B5EFF";
}
