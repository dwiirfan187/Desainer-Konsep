/**
 * POST /api/generate-concept
 *
 * Menerima brief form, memanggil AI API (Claude atau GPT),
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

// ---------------------------------------------------------------------------
// Types untuk request/response
// ---------------------------------------------------------------------------

export interface GenerateConceptRequest {
  brief: BriefFormValues;
  /** Request ID lama jika ini adalah "Generate Ulang" — untuk overwrite */
  existingRequestId?: string;
}

export interface GenerateConceptSuccess {
  requestId: string;
  concepts: Array<{
    id: string;
    title: string;
    description: string;
    color_palette: string[];
    style_reference: string;
  }>;
}

export interface GenerateConceptError {
  error: string;
  code: "VALIDATION_ERROR" | "AI_ERROR" | "DB_ERROR" | "UNKNOWN_ERROR";
}

// ---------------------------------------------------------------------------
// Pilih provider AI dari env vars (Claude diutamakan, fallback ke OpenAI)
// ---------------------------------------------------------------------------

type AIProvider = "anthropic" | "openai";

function getAIProvider(): AIProvider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  throw new Error(
    "Tidak ada AI API key yang dikonfigurasi. Set ANTHROPIC_API_KEY atau OPENAI_API_KEY di .env.local"
  );
}

// ---------------------------------------------------------------------------
// Caller untuk Anthropic Claude API
// ---------------------------------------------------------------------------

async function callClaude(userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY tidak tersedia");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 2048,
      system: CONCEPT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Claude response kosong atau tidak terduga");
  return text as string;
}

// ---------------------------------------------------------------------------
// Caller untuk OpenAI GPT API
// ---------------------------------------------------------------------------

async function callOpenAI(userPrompt: string): Promise<string> {
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
      max_tokens: 2048,
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CONCEPT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI response kosong atau tidak terduga");
  return text as string;
}

// ---------------------------------------------------------------------------
// Dispatcher: pilih provider, panggil AI, return raw string
// ---------------------------------------------------------------------------

async function callAI(userPrompt: string): Promise<string> {
  const provider = getAIProvider();
  if (provider === "anthropic") return callClaude(userPrompt);
  return callOpenAI(userPrompt);
}

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

  const { brief, existingRequestId } = body;

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

  // 4. Panggil AI
  let rawAIResponse: string;
  try {
    const userPrompt = buildUserPrompt(brief);
    rawAIResponse = await callAI(userPrompt);
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
  let savedConcepts: Array<{ id: string; title: string; description: string; color_palette: string[]; style_reference: string }>;

  try {
    const inserts = parsed.concepts.map((c) => ({
      request_id: requestId,
      title: c.title,
      description: c.description,
      color_palette: c.color_palette,
      style_reference: c.style_reference,
    }));

    const { data, error } = await supabaseAdminUntyped
      .from("generated_concepts")
      .insert(inserts)
      .select("id, title, description, color_palette, style_reference");

    if (error || !data) throw new Error(error?.message ?? "Insert konsep gagal");
    savedConcepts = data as typeof savedConcepts;
  } catch (err) {
    console.error("[generate-concept] DB error saat simpan konsep:", err);
    // Konsep sudah digenerate tapi gagal disimpan — tetap kembalikan hasilnya
    // supaya user tidak kehilangan hasil kerja AI
    savedConcepts = parsed.concepts.map((c, i) => ({
      id: `temp-${i}`,
      ...c,
    }));
  }

  // 7. Return sukses
  return NextResponse.json<GenerateConceptSuccess>(
    { requestId, concepts: savedConcepts },
    { status: 200 }
  );
}
