/**
 * brief-schema.ts
 *
 * Validasi dan type definitions untuk form brief (PRD §5.1).
 * Dipisah dari UI supaya bisa dipakai ulang di API route nanti.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DesignType = "poster" | "feed" | "logo" | "banner";

export interface BriefFormValues {
  /** Jenis Desain — wajib (PRD §5.1) */
  design_type: DesignType | "";
  /** Topik/Tema — wajib, maks 500 karakter (PRD §5.1 + DB constraint) */
  topic: string;
  /** Mood/Vibe — wajib, minimal 1 (PRD §5.1) */
  mood_tags: string[];
  /** Target Audiens — opsional, maks 200 karakter */
  target_audience: string;
  /** Warna Favorit — opsional, maks 200 karakter */
  color_preference: string;
  /** Referensi Tambahan — opsional, maks 1000 karakter */
  extra_notes: string;
}

export type BriefFormErrors = Partial<Record<keyof BriefFormValues, string>>;

// ---------------------------------------------------------------------------
// Opsi Jenis Desain (PRD §3)
// ---------------------------------------------------------------------------
export const DESIGN_TYPE_OPTIONS: Array<{
  value: DesignType;
  label: string;
  emoji: string;
  description: string;
}> = [
  {
    value: "poster",
    label: "Poster Event",
    emoji: "🎪",
    description: "Poster untuk acara, konser, pameran, dsb.",
  },
  {
    value: "feed",
    label: "Feed / Story Instagram",
    emoji: "📱",
    description: "Konten media sosial: feed square, carousel, atau stories.",
  },
  {
    value: "logo",
    label: "Logo & Branding",
    emoji: "✏️",
    description: "Logo, mark, atau identitas visual sederhana.",
  },
  {
    value: "banner",
    label: "Banner Promosi",
    emoji: "🏷️",
    description: "Banner diskon, promosi produk, atau iklan digital.",
  },
];

// ---------------------------------------------------------------------------
// Opsi Mood/Vibe (PRD §5.1 + DESIGN.md §3.2)
// Tiap mood punya warna chip konsisten dari palet §1.1
// ---------------------------------------------------------------------------
import type { ChipColor } from "@/components/ui/chip";

export const MOOD_OPTIONS: Array<{
  value: string;
  label: string;
  emoji: string;
  color: ChipColor;
  description: string;
}> = [
  {
    value: "hangat",
    label: "Hangat",
    emoji: "🌅",
    color: "secondary",
    description: "Warna earth tone, nyaman, seperti cahaya pagi",
  },
  {
    value: "minimalis",
    label: "Minimalis",
    emoji: "◻️",
    color: "primary",
    description: "Bersih, whitespace besar, elemen tereduksi",
  },
  {
    value: "playful",
    label: "Playful",
    emoji: "🎉",
    color: "coral",
    description: "Warna-warni, energik, fun, tidak kaku",
  },
  {
    value: "elegan",
    label: "Elegan",
    emoji: "✨",
    color: "violet",
    description: "Mewah, sophisticated, proporsi halus",
  },
  {
    value: "fresh",
    label: "Fresh",
    emoji: "🌿",
    color: "green",
    description: "Hijau natural, ringan, bersih, organik",
  },
  {
    value: "bold",
    label: "Bold",
    emoji: "⚡",
    color: "coral",
    description: "Kontras tinggi, tipografi besar, statement kuat",
  },
  {
    value: "retro",
    label: "Retro",
    emoji: "📼",
    color: "violet",
    description: "Nostalgia, grain, palet vintage, 70s–90s",
  },
  {
    value: "natural",
    label: "Natural",
    emoji: "🍃",
    color: "green",
    description: "Organik, earthy, tekstur kasar, sustainable",
  },
  {
    value: "modern",
    label: "Modern",
    emoji: "🔷",
    color: "primary",
    description: "Kontemporer, geometric, tech-forward",
  },
  {
    value: "gelap",
    label: "Gelap & Dramatis",
    emoji: "🌑",
    color: "violet",
    description: "Dark background, kontras tajam, mood intens",
  },
];

// ---------------------------------------------------------------------------
// Validasi
// ---------------------------------------------------------------------------

/** Karakter maksimal per field (sesuai DB constraint di migration) */
export const FIELD_LIMITS = {
  topic: 500,
  target_audience: 200,
  color_preference: 200,
  extra_notes: 1000,
} as const;

/**
 * Validasi nilai form.
 * Return object errors — kosong berarti valid.
 */
export function validateBriefForm(values: BriefFormValues): BriefFormErrors {
  const errors: BriefFormErrors = {};

  // Jenis Desain — wajib
  if (!values.design_type) {
    errors.design_type = "Pilih dulu jenis desain yang mau dibuat.";
  }

  // Topik/Tema — wajib, 3–500 karakter
  const topic = values.topic.trim();
  if (!topic) {
    errors.topic = "Topik/tema tidak boleh kosong.";
  } else if (topic.length < 3) {
    errors.topic = "Topik terlalu pendek — minimal 3 karakter.";
  } else if (topic.length > FIELD_LIMITS.topic) {
    errors.topic = `Topik terlalu panjang — maksimal ${FIELD_LIMITS.topic} karakter.`;
  }

  // Mood/Vibe — wajib, minimal 1
  if (values.mood_tags.length === 0) {
    errors.mood_tags = "Pilih minimal satu mood/vibe.";
  }

  // Target Audiens — opsional, maks 200 karakter
  if (values.target_audience.length > FIELD_LIMITS.target_audience) {
    errors.target_audience = `Maksimal ${FIELD_LIMITS.target_audience} karakter.`;
  }

  // Warna Favorit — opsional, maks 200 karakter
  if (values.color_preference.length > FIELD_LIMITS.color_preference) {
    errors.color_preference = `Maksimal ${FIELD_LIMITS.color_preference} karakter.`;
  }

  // Referensi Tambahan — opsional, maks 1000 karakter
  if (values.extra_notes.length > FIELD_LIMITS.extra_notes) {
    errors.extra_notes = `Maksimal ${FIELD_LIMITS.extra_notes} karakter.`;
  }

  return errors;
}

/** Nilai awal form yang kosong */
export const INITIAL_FORM_VALUES: BriefFormValues = {
  design_type: "",
  topic: "",
  mood_tags: [],
  target_audience: "",
  color_preference: "",
  extra_notes: "",
};
