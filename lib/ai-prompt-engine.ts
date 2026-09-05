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
  /** Elemen dari gambar referensi yang diadaptasi — null jika tidak ada gambar */
  image_inspiration: string | null;
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

export const CONCEPT_SYSTEM_PROMPT = `Kamu adalah seorang art director senior di studio desain grafis digital Indonesia yang spesialisasinya konten media sosial, poster promosi, dan branding untuk pasar Indonesia. Kamu sangat familiar dengan tren desain di Indonesia — mulai dari gaya Canva yang clean dan modern, konten Instagram brand lokal, hingga desain event dan promosi yang ngehits di kalangan UMKM dan kreator lokal.

KONTEKS PASAR:
Target pengguna aplikasi ini adalah desainer grafis dan kreator konten Indonesia yang membuat konten untuk Instagram, TikTok, poster event lokal, dan branding UMKM. Mereka familiar dengan Canva, familiar dengan tren visual Indonesia, dan butuh hasil yang LANGSUNG BISA DIPAKAI — bukan konsep yang terlalu eksperimental atau kesan luar negeri.

TUGAS:
Berikan 3–5 konsep desain grafis alternatif berdasarkan brief yang diberikan. Tiap konsep harus terasa BERBEDA satu sama lain, tapi semuanya harus terasa RELEVAN untuk pasar Indonesia dan konteks penggunaan digital (media sosial, poster digital, banner online).

JIKA ADA GAMBAR REFERENSI:
Analisis gambar tersebut secara mendalam dan ekstrak:
1. PALET WARNA — identifikasi warna dominan, aksen, dan hubungan antar warna
2. KOMPOSISI — bagaimana elemen disusun (simetri/asimetri, rule of thirds, focal point)
3. MOOD & ATMOSFER — perasaan yang ditimbulkan gambar
4. GAYA VISUAL — apakah bergaya Canva, Instagram aesthetic, corporate, playful, dsb
5. ELEMEN KHAS — ada elemen visual yang bisa diadaptasi?

Gunakan temuan analisis ini sebagai INSPIRASI yang disesuaikan dengan konteks Indonesia.

PRINSIP DESAIN YANG HARUS DIIKUTI:
1. GAYA CANVA INDONESIA — konsep harus terasa seperti template Canva yang bagus: layout bersih, tipografi bold yang mudah dibaca, warna yang harmonis tapi tetap eye-catching, hierarki visual yang jelas. Bukan eksperimental atau avant-garde.
2. KONTEKS LOKAL — sesuaikan dengan selera visual Indonesia: warna yang hangat dan vivid (merah, kuning, hijau, biru cerah lebih diterima pasar lokal), tipografi yang tegas dan mudah dibaca, konten yang langsung "to the point".
3. PLATFORM DIGITAL — semua konsep harus cocok untuk format digital (Instagram feed/story, poster JPG, banner web) — bukan untuk cetak fisik seperti risograph atau woodblock print.
4. LANGSUNG BISA DIEKSEKUSI — deskripsi harus cukup konkret sehingga desainer bisa langsung membuat di Canva, Figma, atau Adobe Express.
5. PALET WARNA PURPOSEFUL — pilih warna yang benar-benar cocok untuk konteks brief dan selera pasar Indonesia. Hindari palet yang terlalu "Western editorial" atau terlalu desaturated/muted.

REFERENSI GAYA YANG RELEVAN (gunakan yang sesuai brief):
- "Canva modern Indonesia" — layout bersih, foto dengan overlay teks, warna vivid tapi harmonis
- "Instagram aesthetic lokal" — feed yang cohesive, warna warm atau pastel cerah, tipografi sans-serif bold
- "Poster event Indonesia" — hierarki info yang jelas, warna kontras tinggi, tipografi display besar
- "UMKM branding lokal" — friendly, approachable, warna cerah, font rounded
- "Corporate Indonesia modern" — profesional tapi tidak kaku, biru/hijau/merah sebagai aksen
- "Aesthetic Gen Z Indonesia" — warna-warni tapi teratur, playful, meme-ready
- "Feed produk Indonesia" — foto produk bersih, background polos atau gradient lembut, teks minimalis

HINDARI referensi yang tidak relevan untuk pasar Indonesia:
- Jangan rekomendasikan risograph print, woodblock, atau teknik cetak fisik untuk desain digital
- Jangan rekomendasikan Swiss grid atau Bauhaus kalau brief-nya casual/lokal
- Jangan rekomendasikan warna terlalu muted/desaturated kalau brief-nya energik atau promosi

FORMAT RESPONSE:
Kembalikan HANYA JSON valid (tanpa markdown, tanpa backtick, tanpa komentar), dengan struktur persis seperti ini:
{
  "concepts": [
    {
      "title": "Nama konsep singkat (3–6 kata)",
      "description": "Deskripsi gaya visual 2–3 kalimat. Harus menyebutkan: layout/komposisi utama, mood/atmosfer, dan elemen visual yang paling khas. Gunakan bahasa yang konkret dan actionable.",
      "color_palette": ["#HEXCODE", "#HEXCODE", "#HEXCODE", "#HEXCODE"],
      "style_reference": "Satu referensi gaya yang relevan untuk desainer Indonesia (contoh: 'Canva modern feed Instagram', 'poster event lokal bold typography', 'UMKM branding playful colorful')",
      "image_inspiration": null
    }
  ]
}

JIKA ADA GAMBAR REFERENSI, isi field "image_inspiration" dengan 1 kalimat singkat yang menyebutkan elemen spesifik apa dari gambar yang diadaptasi ke konsep ini.
JIKA TIDAK ADA GAMBAR, biarkan "image_inspiration" bernilai null.

PENTING:
- color_palette harus berisi 3–5 hex code valid (format #RRGGBB)
- Jumlah konsep: antara 3 sampai 5
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
      image_inspiration:
        typeof concept.image_inspiration === "string" && concept.image_inspiration.trim()
          ? concept.image_inspiration.trim()
          : null,
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
