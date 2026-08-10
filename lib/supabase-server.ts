/**
 * lib/supabase-server.ts
 *
 * Server-side Supabase client menggunakan @supabase/ssr.
 * Wajib dipakai di:
 *   - Route Handlers (app/api/**, app/auth/**)
 *   - Server Components
 *   - Middleware
 *
 * Perbedaan kritis dari lib/supabase.ts (browser client):
 *   - Membaca & menulis session dari/ke HTTP cookies — bukan localStorage.
 *   - Dengan ini session bisa dibaca di server, bukan cuma di browser.
 *   - exchangeCodeForSession() akan otomatis set-cookie ke response.
 *
 * ⚠️  JANGAN import ini dari Client Components ('use client').
 *     Untuk Client Components, tetap pakai lib/supabase.ts.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

/**
 * Buat Supabase client untuk Server Component atau Route Handler.
 * Harus dipanggil di dalam fungsi async (bukan module-level)
 * karena `cookies()` dari next/headers harus dipanggil per-request.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll dipanggil dari Server Component — cookies read-only di sana,
            // bisa diabaikan jika middleware sudah handle session refresh.
          }
        },
      },
    }
  );
}
