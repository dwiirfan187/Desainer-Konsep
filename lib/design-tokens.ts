/**
 * design-tokens.ts
 *
 * Sumber kebenaran tunggal untuk semua design token.
 * Semua nilai di sini harus konsisten dengan definisi di globals.css (@theme).
 * Referensikan file ini di komponen untuk memastikan konsistensi token.
 */

// ---------------------------------------------------------------------------
// WARNA — Palet "Art Supply" (DESIGN.md §1.1)
// ---------------------------------------------------------------------------
export const colors = {
  /** Background utama: off-white keunguan lembut */
  bg: "#FAF7FF",
  /** Teks utama: navy gelap (bukan hitam pekat) */
  ink: "#1A1A2E",
  /** Cobalt blue — tombol CTA, link, aksen utama */
  primary: "#3B5EFF",
  /** Marigold/kuning — highlight, badge, elemen playful */
  secondary: "#FFB100",
  /** Coral pink — hover states, tag mood fun/playful */
  accentCoral: "#FF5C7A",
  /** Grass green — status sukses, tag mood fresh/natural */
  accentGreen: "#2FBF8F",
  /** Violet — aksen tersier, dipakai terbatas untuk variasi kategori */
  accentViolet: "#8B5CF6",
  /** Background kartu/card di atas bg */
  surface: "#FFFFFF",
  /** Border tipis: ink dengan opacity rendah */
  border: "rgba(26, 26, 46, 0.12)",
} as const;

// ---------------------------------------------------------------------------
// TIPOGRAFI — Font families (DESIGN.md §1.2)
// ---------------------------------------------------------------------------
export const fonts = {
  /** Font utama — display, heading, body */
  sans: "var(--font-poppins)",
  /** Font aksen handwritten — tag, sticky note, anotasi */
  accent: "var(--font-caveat)",
} as const;

/** Skala ukuran tipe (px) */
export const fontSizes = {
  /** H1: headline besar */
  h1: { min: 48, max: 64 },
  /** H2: section heading */
  h2: { min: 32, max: 40 },
  /** H3: sub-heading */
  h3: { min: 22, max: 28 },
  /** Body text */
  body: { min: 16, max: 18 },
  /** Caption & eyebrow label */
  caption: { min: 13, max: 14 },
  /** Handwritten accent — tag & anotasi, BUKAN body panjang */
  handwritten: { min: 18, max: 22 },
} as const;

/** Font weight semantic */
export const fontWeights = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  extrabold: "800",
} as const;

// ---------------------------------------------------------------------------
// BORDER RADIUS (DESIGN.md §1.3)
// ---------------------------------------------------------------------------
export const borderRadius = {
  /** Kartu besar / Swatch Card */
  card: "20px",
  /** Input field, button kecil */
  input: "10px",
  /** Tag / chip kecil */
  tag: "8px",
  /** Pill / rounded full */
  pill: "9999px",
} as const;

// ---------------------------------------------------------------------------
// SPACING — Skala 4px rhythm (DESIGN.md §1.3)
// ---------------------------------------------------------------------------
export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  6: "24px",
  8: "32px",
  12: "48px",
  16: "64px",
} as const;

// ---------------------------------------------------------------------------
// SHADOW — Tinted shadows, bukan abu-abu generic (DESIGN.md §1.3)
// ---------------------------------------------------------------------------
export const shadows = {
  /** Shadow default untuk card surface */
  card: "0 4px 24px rgba(26, 26, 46, 0.08)",
  /** Card primary (cobalt) */
  primary: "0 4px 16px rgba(59, 94, 255, 0.2)",
  /** Card secondary (kuning marigold) */
  secondary: "0 4px 16px rgba(255, 177, 0, 0.25)",
  /** Card coral */
  coral: "0 4px 16px rgba(255, 92, 122, 0.2)",
  /** Card green */
  green: "0 4px 16px rgba(47, 191, 143, 0.2)",
  /** Card violet */
  violet: "0 4px 16px rgba(139, 92, 246, 0.2)",
} as const;

// ---------------------------------------------------------------------------
// ROTASI — Elemen playful di concept/prompt card (DESIGN.md §1.4)
// ---------------------------------------------------------------------------
export const rotations = {
  /** Tilt ringan ke kiri */
  negTwo: "-2deg",
  /** Tilt ringan ke kiri sedang */
  negOne: "-1deg",
  /** Netral */
  zero: "0deg",
  /** Tilt ringan ke kanan sedang */
  posOne: "1deg",
  /** Tilt ringan ke kanan */
  posTwo: "2deg",
} as const;

// ---------------------------------------------------------------------------
// MOTION — Durasi dan easing (DESIGN.md §4)
// ---------------------------------------------------------------------------
export const motion = {
  durationFast: "150ms",
  durationBase: "250ms",
  durationSlow: "400ms",
  easingDefault: "cubic-bezier(0.4, 0, 0.2, 1)",
  easingBounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

// ---------------------------------------------------------------------------
// MOOD TAG — Warna per mood sesuai palet (DESIGN.md §1.1 & §3.2)
// ---------------------------------------------------------------------------
export const moodColors: Record<string, { bg: string; text: string; shadow: string }> = {
  hangat: { bg: colors.secondary, text: colors.ink, shadow: shadows.secondary },
  minimalis: { bg: colors.primary, text: "#FFFFFF", shadow: shadows.primary },
  playful: { bg: colors.accentCoral, text: "#FFFFFF", shadow: shadows.coral },
  elegan: { bg: colors.accentViolet, text: "#FFFFFF", shadow: shadows.violet },
  fresh: { bg: colors.accentGreen, text: "#FFFFFF", shadow: shadows.green },
  natural: { bg: colors.accentGreen, text: "#FFFFFF", shadow: shadows.green },
  bold: { bg: colors.ink, text: "#FFFFFF", shadow: shadows.card },
};

// ---------------------------------------------------------------------------
// KATEGORI DESAIN — Warna per kategori (PRD §3)
// ---------------------------------------------------------------------------
export const categoryColors: Record<string, { accent: string; shadow: string }> = {
  poster: { accent: colors.primary, shadow: shadows.primary },
  feed: { accent: colors.accentCoral, shadow: shadows.coral },
  logo: { accent: colors.accentViolet, shadow: shadows.violet },
  banner: { accent: colors.secondary, shadow: shadows.secondary },
};
