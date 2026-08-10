/**
 * lib/supabase.ts
 *
 * Browser client untuk Client Components ('use client') dan lib/auth.ts.
 *
 * PENTING: Pakai createBrowserClient dari @supabase/ssr (BUKAN createClient
 * dari @supabase/supabase-js) karena:
 * - createBrowserClient menyimpan PKCE code verifier di COOKIE
 * - createClient menyimpannya di localStorage
 *
 * Dengan cookie, code verifier bisa dibaca oleh Route Handler di server
 * (app/auth/callback/route.ts) saat memanggil exchangeCodeForSession().
 * Tanpa ini: AuthPKCECodeVerifierMissingError.
 *
 * Export name `supabase` dipertahankan — semua file yang sudah import
 * tidak perlu diubah.
 */

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

/**
 * Supabase browser client — singleton, aman dipanggil berkali-kali
 * karena createBrowserClient sudah handle deduplication internal.
 *
 * Dipakai di:
 *   - Client Components ('use client')
 *   - lib/auth.ts (signInWithGoogle, signInWithEmail, dsb)
 *   - app/history/history-client.tsx
 *   - app/prompt/[id]/prompt-client.tsx
 */
export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
