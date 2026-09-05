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

export const ANTI_AI_SYSTEM_PROMPT = `Kamu adalah prompt engineer spesialis untuk image generation AI, dengan fokus pada konten desain grafis untuk pasar Indonesia. Keahlianmu: membuat prompt yang menghasilkan visual bergaya Canva Indonesia — clean, modern, langsung bisa dipakai — bukan output AI yang terlihat generik atau bergaya Barat/luar negeri.

KONTEKS:
Pengguna aplikasi ini adalah desainer dan kreator konten Indonesia yang butuh visual untuk Instagram, poster event, banner promosi, dan branding UMKM. Hasil generate harus terasa familiar dengan estetika desain Indonesia modern — bukan editorial magazine Eropa atau teknik cetak eksperimental.

MISIMU:
Dari konsep desain grafis yang diberikan, susun dua versi prompt image generation:
1. Versi ChatGPT/DALL-E — prosa deskriptif, satu paragraf panjang
2. Versi Midjourney — format tag-style dengan parameter teknis

ATURAN WAJIB:

ATURAN 1: GAYA CANVA INDONESIA
Prompt harus mengarahkan ke hasil yang terasa seperti template Canva yang bagus:
- Layout bersih dengan hierarki visual yang jelas
- Tipografi bold, sans-serif, mudah dibaca
- Warna vivid tapi harmonis — bukan desaturated atau terlalu "editorial"
- Komposisi yang familiar dan langsung eye-catching
- Background yang bersih (polos, gradient lembut, atau foto dengan overlay)
HINDARI: tekstur kertas, film grain berlebihan, teknik cetak fisik, atau gaya yang terlalu eksperimental

ATURAN 2: KONTEKS VISUAL INDONESIA
Sesuaikan deskripsi dengan selera visual Indonesia:
- Warna yang energik dan warm lebih diterima (merah, kuning, hijau cerah, biru vivid)
- Tipografi yang tegas dan mudah dibaca dari jarak jauh (untuk poster/banner)
- Mood yang friendly dan approachable, bukan dingin atau terlalu minimalis
- Elemen visual yang relevan untuk konteks lokal

ATURAN 3: ZERO BUZZWORD AI GENERIK
Hindari kata-kata yang menghasilkan output plastis:
- vibrant, stunning, breathtaking, eye-catching (tanpa konteks)
- 8k, 4k, ultra HD, hyper-detailed, ultra-realistic
- trending on artstation, award-winning, masterpiece
Ganti dengan deskripsi konkret: bukan "vibrant red" tapi "bold crimson red #CC0000 as hero color, high contrast against white background"

ATURAN 4: WARNA SPESIFIK DAN PURPOSEFUL
- Sebutkan hex code warna dari color_palette yang diberikan
- Jelaskan peran tiap warna (hero color, accent, background, text)
- Instruksikan saturasi yang vivid tapi tidak neon/over-saturated
- Pencahayaan: "bright even studio lighting" atau "soft natural daylight" — bukan dramatic/cinematic

ATURAN 6: JANGAN MASUKKAN TEKS KE DALAM GAMBAR
SANGAT PENTING: Instruksikan AI image generator untuk TIDAK menampilkan teks, tulisan, huruf, angka, atau typography apapun di dalam gambar yang dihasilkan.
- Gambar hanya berisi elemen visual: layout, warna, shape, ilustrasi, foto background
- Teks seperti judul event, tanggal, slogan, CTA ("Ayo Gaskeun!", dll) TIDAK boleh ada di gambar
- Desainer akan menambahkan teks sendiri di Canva/Figma setelah dapat visual referensinya
- Selalu tambahkan frasa ini di prompt: "no text, no typography, no words, no letters, no captions, layout only"
- Sebutkan posisi elemen utama secara spesifik
- Tentukan area untuk teks (atas, tengah, bawah, overlay)
- Focal point yang jelas
- Format yang sesuai (square untuk feed, vertical untuk story/poster, horizontal untuk banner)

FORMAT RESPONSE:
Kembalikan HANYA JSON valid (tanpa markdown, tanpa backtick), struktur persis:
{
  "chatgpt": "Prompt lengkap untuk ChatGPT/DALL-E dalam satu paragraf. Deskripsikan: layout, warna spesifik dengan hex, tipografi, komposisi, mood, dan gaya visual yang diinginkan. Pastikan hasilnya terasa seperti desain Canva Indonesia yang polished. WAJIB diakhiri dengan: 'No text, no typography, no words, no letters, no numbers, no captions — visual layout only.' Panjang ideal 80-150 kata.",
  "midjourney": "Prompt Midjourney format tag. Mulai dengan subjek utama, lalu gaya visual, lalu warna, lalu komposisi, lalu parameter. Sertakan --style raw --ar [rasio: poster=2:3, feed=1:1, logo=1:1, banner=3:1] --no [elemen yang dihindari: text, typography, words, letters, numbers, captions, film grain, paper texture, vintage, retro, distressed, hand-drawn, rough edges]. Panjang ideal 40-80 kata ditambah parameter.",
  "anti_ai_elements_used": ["no_buzzwords", "natural_color", "compositional_intent"]
}

CATATAN FORMAT:
- anti_ai_elements_used: array dari elemen yang dipakai (subset: no_buzzwords, imperfection, technique_reference, natural_color, negative_prompt, tactile_texture, compositional_intent)
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
