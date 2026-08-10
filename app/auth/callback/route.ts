/**
 * GET /auth/callback
 *
 * Handler untuk OAuth callback (Google) dan email verification links dari Supabase.
 * Supabase Auth redirect ke sini setelah user authorize di Google.
 *
 * FIX: Sebelumnya pakai @supabase/supabase-js biasa dengan persistSession: false,
 * sehingga session hasil exchangeCodeForSession() tidak pernah ditulis ke cookie —
 * user langsung dianggap belum login setelah redirect.
 *
 * Sekarang pakai @supabase/ssr createServerClient yang cookie-aware:
 * session ditulis ke response cookies sehingga browser & server bisa membacanya.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/history";

  console.log("[auth/callback] called — code present:", !!code, "| next:", next);
  console.log("[auth/callback] all searchParams:", Object.fromEntries(searchParams.entries()));

  if (code) {
    // Buat response redirect dulu — cookies akan di-set ke response ini
    const redirectResponse = NextResponse.redirect(`${origin}${next}`);

    // Buat Supabase client yang cookie-aware dengan menggunakan response di atas
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // Tulis session ke cookie di response redirect
            // Inilah yang sebelumnya hilang — session tidak pernah sampai ke browser
            cookiesToSet.forEach(({ name, value, options }) => {
              redirectResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    // Exchange PKCE code untuk session — hasilnya otomatis ditulis ke cookie via setAll
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return redirectResponse;
    }

    console.error("[auth/callback] exchangeCodeForSession FAILED");
    console.error("[auth/callback] error.name:", error.name);
    console.error("[auth/callback] error.message:", error.message);
    console.error("[auth/callback] error.status:", error.status);
    console.error("[auth/callback] full error object:", JSON.stringify(error, null, 2));
    console.error("[auth/callback] request URL:", request.url);
    console.error("[auth/callback] code (first 8 chars):", code.slice(0, 8) + "...");
  }

  // Jika tidak ada code atau exchange gagal, redirect ke login dengan pesan error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
