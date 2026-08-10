/**
 * POST /api/generate-prompt
 *
 * Menerima concept_id yang dipilih user, fetch data konsep + brief dari
 * Supabase, memanggil AI via lib/ai-provider (Gemini → OpenAI fallback),
 * lalu menyimpan dua versi prompt (chatgpt + midjourney) ke tabel generated_prompts.
 *
 * Security: API key AI hanya di server (env var), tidak pernah ke client.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminUntyped } from "@/lib/supabase-admin";
import {
  ANTI_AI_SYSTEM_PROMPT,
  buildPromptRequest,
  parsePromptResponse,
  type ConceptInput,
} from "@/lib/anti-ai-prompt-engine";
import { callAI } from "@/lib/ai-provider";

// ---------------------------------------------------------------------------
// Request / Response types
// ---------------------------------------------------------------------------

export interface GeneratePromptRequest {
  concept_id: string;
}

export interface GeneratePromptSuccess {
  /** ID prompt untuk platform chatgpt/dalle */
  chatgpt_prompt_id: string;
  chatgpt_prompt: string;
  /** ID prompt untuk platform midjourney */
  midjourney_prompt_id: string;
  midjourney_prompt: string;
  /** Elemen anti-AI yang aktif, untuk section transparansi di UI */
  anti_ai_elements: Array<{
    id: string;
    label: string;
    explanation: string;
    emoji: string;
  }>;
  /** Data konsep yang dipilih — untuk ditampilkan di halaman output */
  concept: {
    id: string;
    title: string;
    description: string;
    color_palette: string[];
    style_reference: string;
  };
}

export interface GeneratePromptError {
  error: string;
  code: "NOT_FOUND" | "AI_ERROR" | "DB_ERROR" | "VALIDATION_ERROR";
}

// AI dipanggil via lib/ai-provider (Gemini primary → OpenAI fallback)

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Parse body
  let body: GeneratePromptRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<GeneratePromptError>(
      { error: "Request body tidak valid.", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const { concept_id } = body;

  if (!concept_id || typeof concept_id !== "string") {
    return NextResponse.json<GeneratePromptError>(
      { error: "concept_id wajib diisi.", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // 2. Fetch konsep dari Supabase (join dengan design_request untuk brief)
  let conceptInput: ConceptInput;
  let conceptRow: { id: string; title: string; description: string; color_palette: string[]; style_reference: string };

  try {
    // Fetch konsep
    const { data: concept, error: conceptErr } = await supabaseAdminUntyped
      .from("generated_concepts")
      .select("id, title, description, color_palette, style_reference, request_id")
      .eq("id", concept_id)
      .single();

    if (conceptErr || !concept) {
      return NextResponse.json<GeneratePromptError>(
        { error: "Konsep tidak ditemukan.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Fetch design_request terkait untuk konteks brief
    const { data: request, error: requestErr } = await supabaseAdminUntyped
      .from("design_requests")
      .select("design_type, topic, mood_tags, target_audience, color_preference, extra_notes")
      .eq("id", concept.request_id)
      .single();

    if (requestErr || !request) {
      return NextResponse.json<GeneratePromptError>(
        { error: "Brief terkait tidak ditemukan.", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    conceptRow = {
      id: concept.id as string,
      title: concept.title as string,
      description: concept.description as string,
      color_palette: concept.color_palette as string[],
      style_reference: concept.style_reference as string,
    };

    conceptInput = {
      title: concept.title as string,
      description: concept.description as string,
      color_palette: concept.color_palette as string[],
      style_reference: concept.style_reference as string,
      design_type: request.design_type as string,
      topic: request.topic as string,
      mood_tags: request.mood_tags as string[],
      target_audience: request.target_audience as string | null,
      color_preference: request.color_preference as string | null,
      extra_notes: request.extra_notes as string | null,
    };
  } catch (err) {
    console.error("[generate-prompt] DB fetch error:", err);
    return NextResponse.json<GeneratePromptError>(
      { error: "Gagal mengambil data konsep. Coba lagi ya.", code: "DB_ERROR" },
      { status: 500 }
    );
  }

  // 3. Cek apakah prompt untuk konsep ini sudah pernah digenerate
  //    (idempotent — jika sudah ada, return yang tersimpan)
  try {
    const { data: existing } = await supabaseAdminUntyped
      .from("generated_prompts")
      .select("id, prompt_text, platform_target")
      .eq("concept_id", concept_id)
      .in("platform_target", ["chatgpt", "midjourney"]);

    if (existing && existing.length >= 2) {
      const chatgptRow = (existing as Array<{ id: string; prompt_text: string; platform_target: string }>)
        .find((p) => p.platform_target === "chatgpt");
      const mjRow = (existing as Array<{ id: string; prompt_text: string; platform_target: string }>)
        .find((p) => p.platform_target === "midjourney");

      if (chatgptRow && mjRow) {
        // Prompt sudah ada — parse ulang elemen anti-AI dari field anti_ai_elements
        // yang disimpan di DB (lihat step 5). Sementara fallback ke default elements.
        const { data: withElements } = await supabaseAdminUntyped
          .from("generated_prompts")
          .select("id, prompt_text, platform_target, anti_ai_elements")
          .eq("concept_id", concept_id)
          .in("platform_target", ["chatgpt", "midjourney"]);

        const cgRow = (withElements as Array<{ id: string; prompt_text: string; platform_target: string; anti_ai_elements: unknown }>)
          ?.find((p) => p.platform_target === "chatgpt");
        const mjRowFull = (withElements as Array<{ id: string; prompt_text: string; platform_target: string; anti_ai_elements: unknown }>)
          ?.find((p) => p.platform_target === "midjourney");

        const { ANTI_AI_ELEMENTS } = await import("@/lib/anti-ai-prompt-engine");
        const elements = Array.isArray(cgRow?.anti_ai_elements)
          ? ANTI_AI_ELEMENTS.filter((e) =>
              (cgRow.anti_ai_elements as string[]).includes(e.id)
            )
          : ANTI_AI_ELEMENTS.slice(0, 4);

        return NextResponse.json<GeneratePromptSuccess>({
          chatgpt_prompt_id: cgRow?.id ?? chatgptRow.id,
          chatgpt_prompt: cgRow?.prompt_text ?? chatgptRow.prompt_text,
          midjourney_prompt_id: mjRowFull?.id ?? mjRow.id,
          midjourney_prompt: mjRowFull?.prompt_text ?? mjRow.prompt_text,
          anti_ai_elements: elements,
          concept: conceptRow,
        });
      }
    }
  } catch {
    // Jika check existing gagal, lanjut generate baru
  }

  // 4. Panggil AI
  let rawResponse: string;
  try {
    const userPrompt = buildPromptRequest(conceptInput);
    const result = await callAI({
      systemPrompt: ANTI_AI_SYSTEM_PROMPT,
      userPrompt,
      maxTokens: 3000,
    });
    rawResponse = result.text;
  } catch (err) {
    console.error("[generate-prompt] AI error:", err);
    return NextResponse.json<GeneratePromptError>(
      {
        error: "Lagi gagal connect ke AI-nya, coba generate ulang ya.",
        code: "AI_ERROR",
      },
      { status: 502 }
    );
  }

  // 5. Parse response
  let parsed: ReturnType<typeof parsePromptResponse>;
  try {
    parsed = parsePromptResponse(rawResponse);
  } catch (err) {
    console.error("[generate-prompt] Parse error:", err, "\nRaw:", rawResponse.slice(0, 500));
    return NextResponse.json<GeneratePromptError>(
      {
        error: "Hasil dari AI-nya formatnya aneh, coba generate ulang ya.",
        code: "AI_ERROR",
      },
      { status: 502 }
    );
  }

  // 6. Simpan dua versi prompt ke Supabase
  const elementIds = parsed.anti_ai_elements.map((e) => e.id);
  let chatgptPromptId: string;
  let midjourneyPromptId: string;

  try {
    const { data: savedPrompts, error: insertErr } = await supabaseAdminUntyped
      .from("generated_prompts")
      .insert([
        {
          concept_id,
          prompt_text: parsed.chatgpt,
          platform_target: "chatgpt",
          anti_ai_elements: elementIds,
        },
        {
          concept_id,
          prompt_text: parsed.midjourney,
          platform_target: "midjourney",
          anti_ai_elements: elementIds,
        },
      ])
      .select("id, platform_target");

    if (insertErr || !savedPrompts || savedPrompts.length < 2) {
      throw new Error(insertErr?.message ?? "Insert prompt gagal");
    }

    const cgSaved = (savedPrompts as Array<{ id: string; platform_target: string }>)
      .find((p) => p.platform_target === "chatgpt");
    const mjSaved = (savedPrompts as Array<{ id: string; platform_target: string }>)
      .find((p) => p.platform_target === "midjourney");

    chatgptPromptId = cgSaved?.id ?? `temp-chatgpt`;
    midjourneyPromptId = mjSaved?.id ?? `temp-midjourney`;
  } catch (err) {
    console.error("[generate-prompt] DB insert error:", err);
    // Prompt tetap dikembalikan meski gagal disimpan
    chatgptPromptId = `temp-chatgpt`;
    midjourneyPromptId = `temp-midjourney`;
  }

  return NextResponse.json<GeneratePromptSuccess>(
    {
      chatgpt_prompt_id: chatgptPromptId,
      chatgpt_prompt: parsed.chatgpt,
      midjourney_prompt_id: midjourneyPromptId,
      midjourney_prompt: parsed.midjourney,
      anti_ai_elements: parsed.anti_ai_elements,
      concept: conceptRow,
    },
    { status: 200 }
  );
}
