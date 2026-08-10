import type { Metadata } from "next";
import { Suspense } from "react";
import LoginClient from "./login-client";

export const metadata: Metadata = {
  title: "Masuk atau Daftar — Desainer Konsep",
  description: "Login atau buat akun untuk menyimpan riwayat konsep dan prompt kamu.",
};

/**
 * Skeleton fallback saat LoginClient (yang pakai useSearchParams) belum siap.
 * Konsisten dengan design token: bg #FAF7FF, warna ink, font Poppins.
 */
function LoginSkeleton() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ backgroundColor: "#FAF7FF" }}
      aria-busy="true"
      aria-label="Memuat halaman login…"
    >
      <div className="w-full max-w-[420px] px-5 space-y-4 animate-pulse">
        {/* Logo placeholder */}
        <div className="flex items-center gap-2 mb-8">
          <div
            className="h-6 w-6 rounded-[5px]"
            style={{ backgroundColor: "rgba(26,26,46,0.10)" }}
          />
          <div
            className="h-4 w-32 rounded-[6px]"
            style={{ backgroundColor: "rgba(26,26,46,0.10)" }}
          />
        </div>
        {/* Heading placeholder */}
        <div
          className="h-8 w-3/4 rounded-[8px] mx-auto"
          style={{ backgroundColor: "rgba(26,26,46,0.08)" }}
        />
        {/* Toggle placeholder */}
        <div
          className="h-10 w-full rounded-[12px]"
          style={{ backgroundColor: "rgba(26,26,46,0.07)" }}
        />
        {/* Input placeholders */}
        <div
          className="h-12 w-full rounded-[10px]"
          style={{ backgroundColor: "rgba(26,26,46,0.07)" }}
        />
        <div
          className="h-12 w-full rounded-[10px]"
          style={{ backgroundColor: "rgba(26,26,46,0.07)" }}
        />
        {/* Button placeholder */}
        <div
          className="h-12 w-full rounded-[12px]"
          style={{ backgroundColor: "rgba(59,94,255,0.15)" }}
        />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginClient />
    </Suspense>
  );
}
