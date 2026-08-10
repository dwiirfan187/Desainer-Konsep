/**
 * POST /api/generate-prompt
 *
 * Menerima concept_id yang dipilih user, fetch data konsep + brief dari
 * Supabase, memanggil AI dengan anti-AI-look system prompt, lalu menyimpan
 * dua versi prompt (chatgpt + midjourney) ke tabel generated_prompts.
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

// ---------------------------------------------------------------------------
// AI callers — identik dengan pattern di generate-concept/route.ts
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
      max_tokens: 3000,
      system: ANTI_AI_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.content?.[0]?.text;
  if (!text) throw new Error("Claude response kosong");
  return text as string;
}

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
      max_tokens: 3000,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: ANTI_AI_SYSTEM_PROMPT },
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
  if (!text) throw new Error("OpenAI response kosong");
  return text as string;
}

async function callAI(userPrompt: string): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) return callClaude(userPrompt);
  if (process.env.OPENAI_API_KEY) return callOpenAI(userPrompt);
  throw new Error("Tidak ada AI API key yang dikonfigurasi");
}

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
    rawResponse = await callAI(userPrompt);
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
