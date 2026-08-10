/**
 * POST /api/upload-image
 *
 * Menerima gambar dari form brief (multipart/form-data),
 * upload ke Supabase Storage bucket "reference-images",
 * return public URL.
 *
 * Security:
 * - Validasi ulang mime type & ukuran di server (defense in depth)
 * - Pakai supabaseAdmin (service role) untuk upload — bucket tidak butuh user token
 * - Filename di-randomize supaya tidak bisa ditebak/di-enumerate
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const BUCKET = "reference-images";

export async function POST(req: NextRequest) {
  // Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Request tidak valid." }, { status: 400 });
  }

  const file = formData.get("image");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: "Field 'image' wajib diisi." }, { status: 400 });
  }

  // Validasi server-side
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Format tidak didukung. Pakai JPG, PNG, atau WebP." },
      { status: 422 }
    );
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: `Ukuran terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maks 5MB.` },
      { status: 422 }
    );
  }

  // Generate filename yang unik
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const filename = `${timestamp}-${random}.${ext}`;
  const storagePath = `briefs/${filename}`;

  // Upload ke Supabase Storage
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[upload-image] Storage upload error:", uploadError.message);
    return NextResponse.json(
      { error: "Gagal upload gambar. Coba lagi ya." },
      { status: 500 }
    );
  }

  // Ambil public URL
  const { data: urlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  return NextResponse.json({ url: urlData.publicUrl }, { status: 200 });
}
