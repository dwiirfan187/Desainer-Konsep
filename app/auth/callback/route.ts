/**
 * GET /auth/callback
 *
 * Handler untuk OAuth callback dan email verification links dari Supabase.
 * Supabase Auth akan redirect ke sini setelah login Google atau klik email verifikasi.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/history";

  if (code) {
    // Exchange code untuk session via server-side client
    // Pakai anon key karena ini flow PKCE dari browser
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Redirect ke halaman yang dituju setelah login berhasil
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Jika ada error atau tidak ada code, redirect ke login dengan pesan error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
