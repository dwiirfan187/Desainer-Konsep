"use client";

import React, { useId, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  formatAuthError,
} from "@/lib/auth";

type AuthMode = "login" | "signup";

// ---------------------------------------------------------------------------
// Input base styles — sama dengan brief form
// ---------------------------------------------------------------------------
const inputBase =
  "w-full rounded-[10px] border px-4 py-3 text-[14px] leading-snug text-[#1A1A2E] placeholder:text-[rgba(26,26,46,0.35)] transition-all duration-[150ms] focus:outline-none bg-white";
const inputIdle =
  "border-[rgba(26,26,46,0.15)] focus:border-[#3B5EFF] focus:shadow-[0_0_0_3px_rgba(59,94,255,0.12)]";
const inputError =
  "border-[#FF5C7A] focus:border-[#FF5C7A] focus:shadow-[0_0_0_3px_rgba(255,92,122,0.12)]";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/history";

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const uid = useId();
  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email.trim()) { setError("Email tidak boleh kosong."); return; }
    if (!password) { setError("Password tidak boleh kosong."); return; }
    if (password.length < 6) { setError("Password minimal 6 karakter."); return; }

    setLoading(true);
    try {
      if (mode === "signup") {
        const { error: err, session } = await signUpWithEmail(email, password);
        if (err) { setError(formatAuthError(err)); return; }
        // Jika session langsung ada (email confirmation disabled), redirect
        if (session) {
          router.push(redirectTo);
        } else {
          // Email confirmation required
          setSuccessMsg("Cek inbox kamu — kami kirim link verifikasi. Setelah klik, langsung bisa login.");
        }
      } else {
        const { error: err } = await signInWithEmail(email, password);
        if (err) { setError(formatAuthError(err)); return; }
        router.push(redirectTo);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(formatAuthError(err));
    // Redirect ditangani oleh OAuth callback
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FAF7FF" }}>

      {/* Nav minimal */}
      <header className="px-6 py-4">
        <a
          href="/"
          className="inline-flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF] rounded-[4px]"
        >
          <div className="flex rounded-[5px] overflow-hidden h-6 w-6 border border-[rgba(26,26,46,0.12)]" aria-hidden="true">
            <div className="flex-1" style={{ backgroundColor: "#3B5EFF" }} />
            <div className="flex-1" style={{ backgroundColor: "#FFB100" }} />
            <div className="flex-1" style={{ backgroundColor: "#FF5C7A" }} />
          </div>
          <span className="text-[14px] font-bold" style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}>
            Desainer Konsep
          </span>
        </a>
      </header>

      {/* Form area */}
      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-[420px]">

          {/* Header */}
          <div className="mb-8 text-center">
            <h1
              className="text-[28px] font-extrabold leading-tight"
              style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
            >
              {mode === "login" ? (
                <>Halo, selamat datang{" "}
                  <span style={{ color: "#3B5EFF", fontFamily: "var(--font-caveat)", fontSize: "1.1em" }}>
                    kembali.
                  </span>
                </>
              ) : (
                <>Yuk bikin{" "}
                  <span style={{ color: "#FF5C7A", fontFamily: "var(--font-caveat)", fontSize: "1.1em" }}>
                    akun.
                  </span>
                </>
              )}
            </h1>
            <p
              className="mt-2 text-[14px]"
              style={{ color: "rgba(26,26,46,0.55)", fontFamily: "var(--font-poppins)" }}
            >
              {mode === "login"
                ? "Login untuk akses riwayat konsep dan prompt kamu."
                : "Gratis selamanya untuk 5 konsep pertama per hari."}
            </p>
          </div>

          {/* Mode toggle */}
          <div
            className="flex rounded-[12px] p-1 mb-6 gap-1"
            style={{ backgroundColor: "rgba(26,26,46,0.06)" }}
            role="group"
            aria-label="Pilih mode"
          >
            {(["login", "signup"] as AuthMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setSuccessMsg(null); }}
                className="flex-1 py-2 rounded-[9px] text-[13px] font-semibold transition-all duration-[150ms] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#3B5EFF]"
                style={{
                  backgroundColor: mode === m ? "#FFFFFF" : "transparent",
                  color: mode === m ? "#1A1A2E" : "rgba(26,26,46,0.5)",
                  boxShadow: mode === m ? "0 1px 4px rgba(26,26,46,0.10)" : "none",
                  fontFamily: "var(--font-poppins)",
                }}
                aria-pressed={mode === m}
              >
                {m === "login" ? "Masuk" : "Daftar"}
              </button>
            ))}
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 rounded-[10px] border py-3 text-[14px] font-medium transition-all duration-[150ms] hover:bg-[rgba(26,26,46,0.03)] active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF] mb-5"
            style={{
              borderColor: "rgba(26,26,46,0.18)",
              color: "#1A1A2E",
              fontFamily: "var(--font-poppins)",
              backgroundColor: "#FFFFFF",
            }}
          >
            <GoogleIcon />
            Lanjut dengan Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ backgroundColor: "rgba(26,26,46,0.10)" }} />
            <span className="text-[12px]" style={{ color: "rgba(26,26,46,0.38)", fontFamily: "var(--font-poppins)" }}>
              atau pakai email
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: "rgba(26,26,46,0.10)" }} />
          </div>

          {/* Error & success feedback */}
          {error && (
            <div
              role="alert"
              className="mb-4 px-4 py-3 rounded-[10px] border text-[13px] flex items-start gap-2"
              style={{ backgroundColor: "rgba(255,92,122,0.06)", borderColor: "rgba(255,92,122,0.25)", color: "#FF5C7A", fontFamily: "var(--font-poppins)" }}
            >
              <span aria-hidden="true" className="mt-0.5">⚠</span>
              {error}
            </div>
          )}
          {successMsg && (
            <div
              role="status"
              className="mb-4 px-4 py-3 rounded-[10px] border text-[13px]"
              style={{ backgroundColor: "rgba(47,191,143,0.06)", borderColor: "rgba(47,191,143,0.25)", color: "#2FBF8F", fontFamily: "var(--font-poppins)" }}
            >
              ✓ {successMsg}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor={emailId} className="block text-[13px] font-semibold mb-1.5" style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}>
                Email
              </label>
              <input
                id={emailId}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@studio.com"
                autoComplete={mode === "login" ? "email" : "email"}
                required
                className={cn(inputBase, error && !successMsg ? inputError : inputIdle)}
                style={{ fontFamily: "var(--font-poppins)" }}
              />
            </div>

            <div>
              <label htmlFor={passwordId} className="block text-[13px] font-semibold mb-1.5" style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}>
                Password
              </label>
              <input
                id={passwordId}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Minimal 6 karakter" : "••••••••"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                className={cn(inputBase, error && !successMsg ? inputError : inputIdle)}
                style={{ fontFamily: "var(--font-poppins)" }}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="w-full mt-2"
            >
              {loading
                ? mode === "login" ? "Lagi masuk…" : "Lagi daftar…"
                : mode === "login" ? "Masuk →" : "Buat Akun →"}
            </Button>
          </form>

          <p
            className="mt-5 text-center text-[12px]"
            style={{ color: "rgba(26,26,46,0.38)", fontFamily: "var(--font-poppins)" }}
          >
            Dengan daftar, kamu setuju dengan syarat penggunaan yang wajar-wajar aja.
          </p>
        </div>
      </main>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
