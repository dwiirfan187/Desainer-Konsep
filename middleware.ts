/**
 * middleware.ts
 *
 * Refresh Supabase session di setiap request supaya:
 * 1. Token yang expired otomatis di-refresh
 * 2. Cookie session selalu up-to-date sebelum Server Components dirender
 *
 * Tanpa ini, session akan expired dan user dianggap logout meski
 * baru saja login — terutama terlihat setelah OAuth callback.
 *
 * Pola ini adalah rekomendasi resmi Supabase untuk Next.js App Router:
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookie di request (untuk downstream middleware/handlers)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Buat response baru dengan cookie yang sudah di-update
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // PENTING: getUser() harus dipanggil agar token di-refresh jika perlu.
  // Jangan hapus baris ini meski hasilnya tidak dipakai di sini.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Jalankan middleware di semua path KECUALI:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - File-file public (svg, png, jpg, dsb)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
