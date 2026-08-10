/**
 * GET /api/concepts/[requestId]
 *
 * Fetch semua konsep yang tersimpan untuk sebuah design_request.
 * Dipakai oleh ConceptsClient saat halaman dimuat.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdminUntyped } from "@/lib/supabase-admin";

interface RouteParams {
  params: Promise<{ requestId: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const { requestId } = await params;

  if (!requestId || typeof requestId !== "string") {
    return NextResponse.json({ error: "requestId tidak valid" }, { status: 400 });
  }

  const { data, error } = await supabaseAdminUntyped
    .from("generated_concepts")
    .select("id, title, description, color_palette, style_reference, created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[GET /api/concepts] DB error:", error);
    return NextResponse.json(
      { error: "Gagal mengambil konsep dari database." },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Konsep tidak ditemukan untuk request ini." },
      { status: 404 }
    );
  }

  return NextResponse.json({ concepts: data }, { status: 200 });
}
