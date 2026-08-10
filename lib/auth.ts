/**
 * lib/auth.ts
 *
 * Helper functions untuk Supabase Auth.
 * Semua auth operations go through ini supaya mudah diganti/di-mock.
 *
 * PRD §5.5: email auth + Google OAuth via Supabase Auth.
 */

import { supabase } from "@/lib/supabase";
import type { User, Session, AuthError } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

// ---------------------------------------------------------------------------
// Read state
// ---------------------------------------------------------------------------

/** Ambil session aktif dari client. Return null jika tidak ada. */
export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

/** Ambil user yang sedang login. Return null jika tidak ada. */
export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

// ---------------------------------------------------------------------------
// Email auth
// ---------------------------------------------------------------------------

export async function signUpWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: `${getAppUrl()}/auth/callback`,
    },
  });
  return { user: data.user ?? null, session: data.session ?? null, error };
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  return { user: data.user ?? null, session: data.session ?? null, error };
}

// ---------------------------------------------------------------------------
// OAuth — Google
// ---------------------------------------------------------------------------

export async function signInWithGoogle(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getAppUrl()}/auth/callback`,
    },
  });
  return { error };
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// ---------------------------------------------------------------------------
// Auth state change listener
// ---------------------------------------------------------------------------

/** Subscribe ke perubahan auth state. Return unsubscribe function. */
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function getAppUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

/** Format error message Supabase Auth ke bahasa casual (DESIGN.md §5) */
export function formatAuthError(error: AuthError | null): string | null {
  if (!error) return null;
  const msg = error.message.toLowerCase();
  if (msg.includes("invalid login credentials") || msg.includes("invalid credentials")) {
    return "Email atau password-nya salah. Coba lagi ya.";
  }
  if (msg.includes("email not confirmed")) {
    return "Email kamu belum diverifikasi. Cek inbox (atau folder spam).";
  }
  if (msg.includes("user already registered")) {
    return "Email ini sudah terdaftar. Langsung login aja ya.";
  }
  if (msg.includes("password should be")) {
    return "Password minimal 6 karakter ya.";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Terlalu banyak percobaan. Tunggu sebentar terus coba lagi.";
  }
  return "Aduh, ada masalah teknis. Coba lagi ya.";
}
