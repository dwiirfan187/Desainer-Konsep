/**
 * POST /api/generate-concept
 *
 * Menerima brief form, memanggil AI API via lib/ai-provider (Gemini → OpenAI),
 * menyimpan hasil ke Supabase, dan mengembalikan requestId + konsep.
 *
 * Security: API key AI hanya ada di server (env var), tidak pernah ke client.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminUntyped } from "@/lib/supabase-admin";
import {
  CONCEPT_SYSTEM_PROMPT,
  buildUserPrompt,
  parseConceptResponse,
} from "@/lib/ai-prompt-engine";
import { validateBriefForm, type BriefFormValues } from "@/lib/brief-schema";
import { callAI } from "@/lib/ai-provider";

// ---------------------------------------------------------------------------
// Types untuk request/response
// ---------------------------------------------------------------------------

export interface GenerateConceptRequest {
  brief: BriefFormValues;
  /** Request ID lama jika ini adalah "Generate Ulang" — untuk overwrite */
  existingRequestId?: string;
  /** URL public gambar referensi (sudah diupload ke Supabase Storage) */
  referenceImageUrl?: string | null;
}

export interface GenerateConceptSuccess {
  requestId: string;
  concepts: Array<{
    id: string;
    title: string;
    description: string;
    color_palette: string[];
    style_reference: string;
    image_inspiration: string | null;
  }>;
}

export interface GenerateConceptError {
  error: string;
  code: "VALIDATION_ERROR" | "AI_ERROR" | "DB_ERROR" | "UNKNOWN_ERROR";
}

// AI dipanggil via lib/ai-provider (Gemini primary → OpenAI fallback)

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Parse request body
  let body: GenerateConceptRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<GenerateConceptError>(
      { error: "Request body tidak valid.", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { brief, existingRequestId, referenceImageUrl } = body;

  // 2. Validasi brief (repakai fungsi yang sama dengan client)
  const validationErrors = validateBriefForm(brief);
  if (Object.keys(validationErrors).length > 0) {
    return NextResponse.json<GenerateConceptError>(
      {
        error: "Brief tidak lengkap: " + Object.values(validationErrors).join("; "),
        code: "VALIDATION_ERROR",
      },
      { status: 422 }
    );
  }

  // 3. Simpan design_request ke Supabase
  //    user_id null untuk sesi anonim (PRD §5.4)
  let requestId: string;

  try {
    if (existingRequestId) {
      // Generate Ulang — update record yang sudah ada
      const { data, error } = await supabaseAdminUntyped
        .from("design_requests")
        .update({
          design_type: brief.design_type,
          topic: brief.topic.trim(),
          mood_tags: brief.mood_tags,
          target_audience: brief.target_audience?.trim() || null,
          color_preference: brief.color_preference?.trim() || null,
          extra_notes: brief.extra_notes?.trim() || null,
          reference_image_url: referenceImageUrl ?? null,
        })
        .eq("id", existingRequestId)
        .select("id")
        .single();

      if (error || !data) throw new Error(error?.message ?? "Update request gagal");
      requestId = data.id as string;

      // Hapus konsep lama sebelum insert yang baru (cascade juga hapus prompt-nya)
      await supabaseAdminUntyped
        .from("generated_concepts")
        .delete()
        .eq("request_id", requestId);
    } else {
      // Request baru
      const { data, error } = await supabaseAdminUntyped
        .from("design_requests")
        .insert({
          user_id: null,
          design_type: brief.design_type,
          topic: brief.topic.trim(),
          mood_tags: brief.mood_tags,
          target_audience: brief.target_audience?.trim() || null,
          color_preference: brief.color_preference?.trim() || null,
          extra_notes: brief.extra_notes?.trim() || null,
          reference_image_url: referenceImageUrl ?? null,
        })
        .select("id")
        .single();

      if (error || !data) throw new Error(error?.message ?? "Insert request gagal");
      requestId = data.id as string;
    }
  } catch (err) {
    console.error("[generate-concept] DB error saat simpan request:", err);
    return NextResponse.json<GenerateConceptError>(
      {
        error: "Gagal menyimpan brief ke database. Coba lagi ya.",
        code: "DB_ERROR",
      },
      { status: 500 }
    );
  }

  // 4. Panggil AI — kalau ada gambar referensi, pakai Gemini multimodal
  let rawAIResponse: string;
  try {
    const userPrompt = buildUserPrompt(brief);

    if (referenceImageUrl && process.env.GEMINI_API_KEY) {
      // Fetch gambar dari Supabase Storage, convert ke base64
      const imgRes = await fetch(referenceImageUrl);
      if (!imgRes.ok) throw new Error(`Gagal fetch gambar referensi: ${imgRes.status}`);
      const imgBuffer = await imgRes.arrayBuffer();
      const imgBase64 = Buffer.from(imgBuffer).toString("base64");
      const imgMimeType = imgRes.headers.get("content-type") ?? "image/jpeg";

      // Gemini multimodal: kirim teks + gambar sekaligus
      const apiKey = process.env.GEMINI_API_KEY;
      const model = "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: CONCEPT_SYSTEM_PROMPT }] },
          contents: [{
            role: "user",
            parts: [
              {
                inline_data: {
                  mime_type: imgMimeType,
                  data: imgBase64,
                },
              },
              { text: `Gambar di atas adalah referensi visual dari user.\n\n${userPrompt}` },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!geminiRes.ok) {
        const errBody = await geminiRes.text();
        console.warn("[generate-concept] Gemini multimodal error, fallback ke text-only:", errBody.slice(0, 200));
        // Fallback ke text-only jika multimodal gagal
        const result = await callAI({ systemPrompt: CONCEPT_SYSTEM_PROMPT, userPrompt, maxTokens: 2048 });
        rawAIResponse = result.text;
      } else {
        const geminiData = await geminiRes.json();
        const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Gemini multimodal response kosong");
        rawAIResponse = text as string;
        console.log("[generate-concept] ✓ Gemini multimodal berhasil (dengan gambar referensi)");
      }
    } else {
      // Text-only — tidak ada gambar atau tidak ada GEMINI_API_KEY
      const result = await callAI({
        systemPrompt: CONCEPT_SYSTEM_PROMPT,
        userPrompt,
        maxTokens: 2048,
      });
      rawAIResponse = result.text;
    }
  } catch (err) {
    console.error("[generate-concept] AI error:", err);
    return NextResponse.json<GenerateConceptError>(
      {
        error: "Lagi gagal connect ke AI-nya, coba generate ulang ya.",
        code: "AI_ERROR",
      },
      { status: 502 }
    );
  }

  // 5. Parse response AI
  let parsed: ReturnType<typeof parseConceptResponse>;
  try {
    parsed = parseConceptResponse(rawAIResponse);
  } catch (err) {
    console.error("[generate-concept] Parse error:", err, "\nRaw:", rawAIResponse.slice(0, 500));
    return NextResponse.json<GenerateConceptError>(
      {
        error: "Hasil dari AI-nya formatnya aneh, coba generate ulang ya.",
        code: "AI_ERROR",
      },
      { status: 502 }
    );
  }

  // 6. Simpan konsep-konsep ke Supabase
  let savedConcepts: Array<{ id: string; title: string; description: string; color_palette: string[]; style_reference: string; image_inspiration: string | null }>;

  try {
    const inserts = parsed.concepts.map((c) => ({
      request_id: requestId,
      title: c.title,
      description: c.description,
      color_palette: c.color_palette,
      style_reference: c.style_reference,
      image_inspiration: c.image_inspiration ?? null,
    }));

    const { data, error } = await supabaseAdminUntyped
      .from("generated_concepts")
      .insert(inserts)
      .select("id, title, description, color_palette, style_reference, image_inspiration");

    if (error || !data) throw new Error(error?.message ?? "Insert konsep gagal");
    savedConcepts = data as typeof savedConcepts;
  } catch (err) {
    console.error("[generate-concept] DB error saat simpan konsep:", err);
    // Konsep sudah digenerate tapi gagal disimpan — tetap kembalikan hasilnya
    // supaya user tidak kehilangan hasil kerja AI
    savedConcepts = parsed.concepts.map((c, i) => ({
      id: `temp-${i}`,
      ...c,
      image_inspiration: c.image_inspiration ?? null,
    }));
  }

  // 7. Return sukses
  return NextResponse.json<GenerateConceptSuccess>(
    { requestId, concepts: savedConcepts },
    { status: 200 }
  );
}
