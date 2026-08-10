/**
 * /api/history
 *
 * GET    — ambil semua riwayat user yang login
 * POST   — simpan prompt ke riwayat
 * DELETE — hapus satu item riwayat (by saved_history.id)
 * PATCH  — toggle is_favorite
 *
 * Auth: semua endpoint butuh session aktif.
 * Identitas user diambil dari Supabase Auth session di server.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Helper: buat server-side Supabase client dari Authorization header
// ---------------------------------------------------------------------------

function makeServerClient(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}

function getToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

async function getUserId(req: NextRequest): Promise<{ userId: string; client: ReturnType<typeof makeServerClient> } | null> {
  const token = getToken(req);
  if (!token) return null;
  const client = makeServerClient(token);
  const { data } = await client.auth.getUser();
  if (!data.user) return null;
  return { userId: data.user.id, client };
}

// ---------------------------------------------------------------------------
// GET /api/history — ambil riwayat user dengan join ke prompt + konsep
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const auth = await getUserId(req);
  if (!auth) {
    return NextResponse.json({ error: "Kamu perlu login dulu." }, { status: 401 });
  }

  const { userId, client } = auth;

  const { data, error } = await client
    .from("saved_history")
    .select(`
      id,
      is_favorite,
      created_at,
      prompt_id,
      generated_prompts!inner (
        id,
        prompt_text,
        platform_target,
        generated_concepts!inner (
          id,
          title,
          description,
          color_palette,
          style_reference,
          design_requests!inner (
            id,
            design_type,
            topic
          )
        )
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/history]", error);
    return NextResponse.json({ error: "Gagal ambil riwayat. Coba lagi ya." }, { status: 500 });
  }

  return NextResponse.json({ history: data ?? [] });
}

// ---------------------------------------------------------------------------
// POST /api/history — simpan prompt ke riwayat
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const auth = await getUserId(req);
  if (!auth) {
    return NextResponse.json({ error: "Kamu perlu login dulu untuk menyimpan." }, { status: 401 });
  }

  const { userId, client } = auth;

  let body: { prompt_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid." }, { status: 400 });
  }

  if (!body.prompt_id) {
    return NextResponse.json({ error: "prompt_id wajib diisi." }, { status: 400 });
  }

  // Upsert — jika sudah ada, tidak error (idempotent)
  const { data, error } = await client
    .from("saved_history")
    .upsert(
      { user_id: userId, prompt_id: body.prompt_id, is_favorite: false },
      { onConflict: "user_id,prompt_id", ignoreDuplicates: true }
    )
    .select("id, is_favorite, created_at")
    .single();

  if (error) {
    // Jika duplicate (sudah disimpan), ambil yang existing
    if (error.code === "23505" || error.message?.includes("duplicate")) {
      const { data: existing } = await client
        .from("saved_history")
        .select("id, is_favorite, created_at")
        .eq("user_id", userId)
        .eq("prompt_id", body.prompt_id)
        .single();
      return NextResponse.json({ saved: existing, already_saved: true });
    }
    console.error("[POST /api/history]", error);
    return NextResponse.json({ error: "Gagal menyimpan. Coba lagi ya." }, { status: 500 });
  }

  return NextResponse.json({ saved: data, already_saved: false }, { status: 201 });
}

// ---------------------------------------------------------------------------
// DELETE /api/history?id=<saved_history_id> — hapus item
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  const auth = await getUserId(req);
  if (!auth) {
    return NextResponse.json({ error: "Kamu perlu login dulu." }, { status: 401 });
  }

  const { userId, client } = auth;
  const id = new URL(req.url).searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id wajib diisi." }, { status: 400 });
  }

  const { error } = await client
    .from("saved_history")
    .delete()
    .eq("id", id)
    .eq("user_id", userId); // pastikan hanya hapus milik sendiri

  if (error) {
    console.error("[DELETE /api/history]", error);
    return NextResponse.json({ error: "Gagal hapus. Coba lagi ya." }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}

// ---------------------------------------------------------------------------
// PATCH /api/history — toggle is_favorite
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  const auth = await getUserId(req);
  if (!auth) {
    return NextResponse.json({ error: "Kamu perlu login dulu." }, { status: 401 });
  }

  const { userId, client } = auth;

  let body: { id: string; is_favorite: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Request tidak valid." }, { status: 400 });
  }

  if (!body.id || typeof body.is_favorite !== "boolean") {
    return NextResponse.json({ error: "id dan is_favorite wajib diisi." }, { status: 400 });
  }

  const { data, error } = await client
    .from("saved_history")
    .update({ is_favorite: body.is_favorite })
    .eq("id", body.id)
    .eq("user_id", userId)
    .select("id, is_favorite")
    .single();

  if (error) {
    console.error("[PATCH /api/history]", error);
    return NextResponse.json({ error: "Gagal update favorit. Coba lagi ya." }, { status: 500 });
  }

  return NextResponse.json({ updated: data });
}
