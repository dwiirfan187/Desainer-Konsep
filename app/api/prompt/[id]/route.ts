/**
 * GET /api/prompt/[id]
 *
 * Fetch satu prompt by ID dari tabel generated_prompts,
 * beserta data konsep terkait untuk ditampilkan di halaman output.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminUntyped } from "@/lib/supabase-admin";
import { ANTI_AI_ELEMENTS } from "@/lib/anti-ai-prompt-engine";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id tidak valid" }, { status: 400 });
  }

  // Fetch prompt
  const { data: prompt, error: promptErr } = await supabaseAdminUntyped
    .from("generated_prompts")
    .select("id, concept_id, prompt_text, platform_target, anti_ai_elements, created_at")
    .eq("id", id)
    .single();

  if (promptErr || !prompt) {
    return NextResponse.json({ error: "Prompt tidak ditemukan." }, { status: 404 });
  }

  // Fetch konsep terkait
  const { data: concept, error: conceptErr } = await supabaseAdminUntyped
    .from("generated_concepts")
    .select("id, title, description, color_palette, style_reference, request_id")
    .eq("id", prompt.concept_id)
    .single();

  if (conceptErr || !concept) {
    return NextResponse.json({ error: "Konsep terkait tidak ditemukan." }, { status: 404 });
  }

  // Fetch semua prompt untuk konsep yang sama (untuk toggle platform)
  const { data: sibling } = await supabaseAdminUntyped
    .from("generated_prompts")
    .select("id, platform_target, prompt_text, anti_ai_elements")
    .eq("concept_id", prompt.concept_id)
    .in("platform_target", ["chatgpt", "midjourney"]);

  // Resolve elemen anti-AI
  const elementIds = Array.isArray(prompt.anti_ai_elements)
    ? (prompt.anti_ai_elements as string[])
    : [];
  const anti_ai_elements = elementIds.length > 0
    ? ANTI_AI_ELEMENTS.filter((e) => elementIds.includes(e.id))
    : ANTI_AI_ELEMENTS.slice(0, 4);

  return NextResponse.json({
    prompt: {
      id: prompt.id,
      prompt_text: prompt.prompt_text,
      platform_target: prompt.platform_target,
    },
    sibling_prompts: (sibling ?? []) as Array<{
      id: string;
      platform_target: string;
      prompt_text: string;
    }>,
    concept: {
      id: concept.id,
      title: concept.title,
      description: concept.description,
      color_palette: concept.color_palette,
      style_reference: concept.style_reference,
    },
    anti_ai_elements,
  });
}
