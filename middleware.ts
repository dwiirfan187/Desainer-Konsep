/**
 * middleware.ts
 *
 * Pass-through middleware — tidak memanggil Supabase sama sekali.
 *
 * Session management ditangani sepenuhnya di sisi client (lib/supabase.ts
 * pakai createBrowserClient yang menyimpan session di cookie) dan di
 * auth callback route (app/auth/callback/route.ts).
 *
 * Middleware Supabase dihapus karena menyebabkan MIDDLEWARE_INVOCATION_TIMEOUT
 * di Vercel — setiap network call ke Supabase dari middleware Edge berisiko
 * timeout pada cold start atau latency tinggi.
 */

import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
