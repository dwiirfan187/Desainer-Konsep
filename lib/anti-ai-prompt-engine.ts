/**
 * anti-ai-prompt-engine.ts
 *
 * MODUL INTI — PRD §5.3, §5.3.1, §12
 *
 * Semua logic "anti-AI-look" prompt engineering ada di sini sebagai module
 * terpisah sehingga bisa di-iterasi independen tanpa menyentuh API route
 * atau komponen UI (PRD §12: "implementasikan sebagai fungsi/module terpisah").
 *
 * Isi modul:
 * 1. ANTI_AI_SYSTEM_PROMPT   — system prompt dengan semua prinsip PRD §5.3.1
 * 2. buildPromptRequest()    — builder: konsep + platform → user prompt string
 * 3. parsePromptResponse()   — parser: raw AI string → typed output
 * 4. ANTI_AI_ELEMENTS        — registry elemen anti-AI yang dipakai (untuk UI transparansi)
 * 5. getAntiAiExplanation()  — ekstrak elemen mana yang aktif di sebuah prompt
 */

export type PlatformTarget = "chatgpt" | "midjourney";

// ---------------------------------------------------------------------------
// Input type — data konsep yang dikirim ke API
// ---------------------------------------------------------------------------

export interface ConceptInput {
  title: string;
  description: string;
  color_palette: string[];
  style_reference: string;
  /** Dari design_request terkait */
  design_type: string;
  topic: string;
  mood_tags: string[];
  target_audience?: string | null;
  color_preference?: string | null;
  extra_notes?: string | null;
}

// ---------------------------------------------------------------------------
// Output type — satu pasang prompt (chatgpt + midjourney)
// ---------------------------------------------------------------------------

export interface GeneratedPromptPair {
  chatgpt: string;
  midjourney: string;
  /** Elemen anti-AI yang disisipkan, untuk section "Kenapa gak kelihatan AI?" */
  anti_ai_elements: AntiAiElement[];
}

// ---------------------------------------------------------------------------
// Registry elemen anti-AI (PRD §5.3.1)
// Dipakai untuk transparansi ke user di section expandable
// ---------------------------------------------------------------------------

export interface AntiAiElement {
  /** ID singkat untuk referensi */
  id: string;
  /** Label ringkas yang ditampilkan ke user */
  label: string;
  /** Penjelasan casual ke user (DESIGN.md §5 — bahasa aktif, bukan teknis) */
  explanation: string;
  /** Emoji penanda visual di UI */
  emoji: string;
}

export const ANTI_AI_ELEMENTS: AntiAiElement[] = [
  {
    id: "no_buzzwords",
    label: "Tanpa buzzword AI",
    explanation:
      'Prompt ini bebas dari kata generik seperti "vibrant", "8K", "hyper-detailed", atau "trending on ArtStation" \u2014 kata-kata itu justru sinyal kuat ke model untuk output yang plastis dan over-rendered.',
    emoji: "🚫",
  },
  {
    id: "imperfection",
    label: "Imperfeksi yang disengaja",
    explanation:
      "Disisipin elemen seperti sedikit misregistrasi cetak, grain film, atau komposisi yang sengaja asimetris — ini yang bikin output terasa dibuat tangan, bukan digenerate mesin.",
    emoji: "✋",
  },
  {
    id: "technique_reference",
    label: "Teknik desain nyata",
    explanation:
      'Pakai referensi teknik cetak atau aliran desain yang spesifik (risograph, swiss grid, woodblock print, dll) bukan deskripsi generik \u2014 model lebih "ngerti" gaya yang punya sejarah dan karakteristik visual nyata.',
    emoji: "📐",
  },
  {
    id: "natural_color",
    label: "Warna & cahaya yang natural",
    explanation:
      'Instruksi warna diarahkan ke palet editorial dengan saturation terkontrol, hindari gradasi terlalu mulus atau warna yang "terlalu sempurna" \u2014 ciri khas output AI yang paling kentara.',
    emoji: "🎨",
  },
  {
    id: "negative_prompt",
    label: "Negative prompt (khusus Midjourney)",
    explanation:
      "Di Midjourney, prompt ini dilengkapi parameter --no yang secara eksplisit menolak ciri khas AI: wajah simetris berlebihan, background blur generik, gradasi neon berlebih.",
    emoji: "⛔",
  },
  {
    id: "tactile_texture",
    label: "Tekstur yang terasa bisa dipegang",
    explanation:
      'Disebutkan tekstur spesifik \u2014 kertas bertekstur, kain kasar, tinta yang sedikit merembes \u2014 supaya model menghasilkan detail yang terasa punya dimensi fisik, bukan surface yang terlalu "digital clean".',
    emoji: "🖐️",
  },
  {
    id: "compositional_intent",
    label: "Komposisi yang disengaja",
    explanation:
      'Posisi elemen visual dideskripsikan secara eksplisit (mis. "teks besar di 1/3 atas", "objek utama off-center ke kiri") \u2014 bukan diserahkan ke model untuk memutuskan sendiri, yang biasanya menghasilkan komposisi template.',
    emoji: "📏",
  },
];

// ---------------------------------------------------------------------------
// SYSTEM PROMPT — engine utama anti-AI-look (PRD §5.3.1)
// ---------------------------------------------------------------------------

export const ANTI_AI_SYSTEM_PROMPT = `Kamu adalah prompt engineer spesialis untuk image generation AI dengan keahlian khusus: membuat prompt yang hasilnya TIDAK terlihat seperti output AI generik.

MISIMU:
Dari konsep desain grafis yang diberikan, susun dua versi prompt image generation:
1. Versi ChatGPT/DALL-E — prosa deskriptif, satu paragraf panjang
2. Versi Midjourney — format tag-style dengan parameter teknis

ATURAN WAJIB — ANTI-AI-LOOK (PRD §5.3.1):

ATURAN 1: ZERO BUZZWORD GENERIK
Dilarang keras menggunakan kata-kata berikut (ini sinyal output plastis/over-rendered):
- vibrant, stunning, breathtaking, eye-catching, beautiful, gorgeous
- 8k, 4k, ultra HD, hyper-detailed, ultra-realistic, photorealistic (kecuali diminta)
- trending on artstation, award-winning, masterpiece, epic
- professional, sleek, modern, clean, elegant (tanpa konteks spesifik)
Ganti dengan deskripsi visual KONKRET: bukan "vibrant colors" tapi "marigold yellow against deep navy, high contrast, matte finish".

ATURAN 2: SISIPKAN IMPERFEKSI YANG DISENGAJA
Minimal satu dari berikut HARUS ada di setiap prompt:
- Slight misregistration / off-register print (untuk gaya cetak)
- Film grain atau paper grain yang terlihat
- Komposisi asimetris yang disengaja
- Tinta yang sedikit merembes di tepi (untuk gaya woodblock/linocut)
- Tangan atau gesture yang terlihat (untuk gaya illustrated)
Ini yang membuat output terasa dibuat tangan, bukan digenerate.

ATURAN 3: TEKNIK DESAIN NYATA SEBAGAI ANCHOR
Gunakan referensi teknik yang spesifik dari style_reference yang diberikan.
Deskripsikan karakteristik teknik tersebut secara eksplisit:
- Risograph: "two-color riso print, ink overlap creates tertiary color, slightly chalky texture"
- Swiss grid: "strict typographic grid, heavy Helvetica Neue weight, generous white space, axis-aligned composition"
- Cut paper: "layered paper cutout shadow, visible paper edge, dimensional depth from layering"
Jangan hanya menyebut nama teknik tanpa karakteristik visualnya.

ATURAN 4: WARNA DAN PENCAHAYAAN YANG NATURAL
- Deskripsikan warna dari color_palette secara eksplisit dengan nama + konteks
- Instruksikan saturation MEDIUM atau MUTED, BUKAN saturasi berlebihan
- Arahkan ke pencahayaan natural: "soft diffused daylight", "overcast flat light", "single side-lit window light"
- Hindari: "dramatic lighting", "god rays", "lens flare" (klise AI)

ATURAN 5: KOMPOSISI EKSPLISIT
Tentukan posisi elemen utama secara spesifik:
- Rule of thirds, golden ratio, atau deliberate asymmetry
- Teks di area spesifik (bukan "centered text" yang generik)
- Focal point yang jelas dan disengaja

FORMAT RESPONSE:
Kembalikan HANYA JSON valid (tanpa markdown, tanpa backtick), struktur persis:
{
  "chatgpt": "Prompt lengkap untuk ChatGPT/DALL-E dalam satu paragraf. Prosa deskriptif, gunakan kalimat lengkap. Sertakan: medium/teknik, komposisi, warna spesifik, tekstur, mood, dan elemen imperfeksi. Panjang ideal 80-150 kata.",
  "midjourney": "Prompt Midjourney dalam format tag. Dimulai dengan subjek utama, lalu tag teknik, lalu tag visual, lalu parameter. Gunakan :: untuk grouping. Sertakan --style raw --ar [rasio sesuai jenis desain] --no [daftar elemen yang dihindari: plastic texture, oversaturated colors, symmetrical composition, gradient mesh, lens flare]. Panjang ideal 40-80 kata ditambah parameter.",
  "anti_ai_elements_used": ["no_buzzwords", "imperfection", "technique_reference", "natural_color", "negative_prompt", "tactile_texture", "compositional_intent"]
}

CATATAN FORMAT:
- anti_ai_elements_used: array string dari elemen yang benar-benar dipakai (subset dari: no_buzzwords, imperfection, technique_reference, natural_color, negative_prompt, tactile_texture, compositional_intent)
- Rasio --ar Midjourney: poster=2:3, feed=1:1, logo=1:1, banner=3:1
- Jangan tambahkan field lain
- Jangan bungkus dengan markdown`;

// ---------------------------------------------------------------------------
// Builder: konsep + platform → user prompt string untuk dikirim ke AI
// ---------------------------------------------------------------------------

export function buildPromptRequest(concept: ConceptInput): string {
  const lines: string[] = [];

  lines.push("KONSEP YANG DIPILIH USER:");
  lines.push(`- Judul konsep: ${concept.title}`);
  lines.push(`- Deskripsi visual: ${concept.description}`);
  lines.push(`- Palet warna: ${concept.color_palette.join(", ")}`);
  lines.push(`- Referensi teknik/gaya: ${concept.style_reference}`);
  lines.push("");
  lines.push("KONTEKS BRIEF ASLI:");
  lines.push(`- Jenis desain: ${concept.design_type}`);
  lines.push(`- Topik/tema: ${concept.topic}`);
  lines.push(`- Mood/vibe: ${concept.mood_tags.join(", ")}`);

  if (concept.target_audience) {
    lines.push(`- Target audiens: ${concept.target_audience}`);
  }
  if (concept.color_preference) {
    lines.push(`- Preferensi warna dari user: ${concept.color_preference}`);
  }
  if (concept.extra_notes) {
    lines.push(`- Catatan tambahan: ${concept.extra_notes}`);
  }

  lines.push("");
  lines.push(
    "Susun dua versi prompt image generation (ChatGPT/DALL-E dan Midjourney) yang menerapkan semua aturan anti-AI-look. Pastikan minimal 4 dari 7 elemen anti-AI-look aktif di tiap versi."
  );

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Parser: raw AI string → GeneratedPromptPair
// ---------------------------------------------------------------------------

export function parsePromptResponse(raw: string): GeneratedPromptPair {
  let cleaned = raw.trim();
  // Bersihkan markdown code block jika AI masih bungkus
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`AI response bukan JSON valid. Raw: ${raw.slice(0, 300)}`);
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Response AI bukan object");
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.chatgpt !== "string" || !obj.chatgpt.trim()) {
    throw new Error("Field 'chatgpt' tidak valid");
  }
  if (typeof obj.midjourney !== "string" || !obj.midjourney.trim()) {
    throw new Error("Field 'midjourney' tidak valid");
  }

  // Parse elemen anti-AI yang dipakai — fallback ke semua elemen jika tidak valid
  const elementIds = new Set(ANTI_AI_ELEMENTS.map((e) => e.id));
  let usedIds: string[] = [];

  if (Array.isArray(obj.anti_ai_elements_used)) {
    usedIds = (obj.anti_ai_elements_used as unknown[])
      .filter((id): id is string => typeof id === "string" && elementIds.has(id));
  }

  // Jika AI tidak return elemen atau return kurang dari 2, pakai fallback minimum
  if (usedIds.length < 2) {
    usedIds = ["no_buzzwords", "imperfection", "technique_reference", "natural_color"];
  }

  const anti_ai_elements = ANTI_AI_ELEMENTS.filter((e) => usedIds.includes(e.id));

  return {
    chatgpt: obj.chatgpt.trim(),
    midjourney: obj.midjourney.trim(),
    anti_ai_elements,
  };
}

// ---------------------------------------------------------------------------
// Helper: ambil prompt text berdasarkan platform target
// ---------------------------------------------------------------------------

export function getPromptForPlatform(
  pair: GeneratedPromptPair,
  platform: PlatformTarget
): string {
  return platform === "midjourney" ? pair.midjourney : pair.chatgpt;
}
