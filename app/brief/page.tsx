import type { Metadata } from "next";
import Link from "next/link";
import { BriefForm } from "./brief-form";
import { AppNav } from "@/components/ui/app-nav";

export const metadata: Metadata = {
  title: "Bikin Brief Desain — Desainer Konsep",
  description:
    "Ceritain brief desain kamu — jenis, topik, mood, dan referensi — dan dapatkan konsep visual + prompt siap pakai.",
  robots: { index: false, follow: false },
};

export default function BriefPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF7FF" }}>
      <AppNav />

      <div className="max-w-[640px] mx-auto px-5 py-10 md:py-16">

        {/* ----------------------------------------------------------------
            Back nav
        ---------------------------------------------------------------- */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-8 rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF]"
          style={{ color: "rgba(26,26,46,0.5)", fontFamily: "var(--font-poppins)" }}
        >
          <span aria-hidden="true">←</span> Kembali ke beranda
        </Link>

        {/* ----------------------------------------------------------------
            Page header
        ---------------------------------------------------------------- */}
        <header className="mb-10">
          {/* Eyebrow */}
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "#3B5EFF", fontFamily: "var(--font-poppins)" }}
          >
            Step 1 dari 3
          </span>

          {/* H1 */}
          <h1
            className="mt-2 text-[30px] md:text-[36px] font-extrabold leading-tight tracking-[-0.01em]"
            style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
          >
            Ceritain brief{" "}
            <span
              style={{
                color: "#FF5C7A",
                fontFamily: "var(--font-caveat)",
                fontSize: "1.05em",
              }}
            >
              kamu.
            </span>
          </h1>

          {/* Subheading — DESIGN.md §5: bahasa casual */}
          <p
            className="mt-3 text-[15px] leading-relaxed"
            style={{ color: "rgba(26,26,46,0.6)", fontFamily: "var(--font-poppins)" }}
          >
            Gak perlu panjang-panjang. Makin spesifik makin bagus hasilnya —
            tapi brief singkat pun bisa menghasilkan konsep yang nendang.
          </p>

          {/* Progress bar visual */}
          <div className="mt-5 flex items-center gap-2" aria-label="Progress: step 1 dari 3">
            {[
              { label: "Brief", active: true, done: false },
              { label: "Konsep", active: false, done: false },
              { label: "Prompt", active: false, done: false },
            ].map((step, i) => (
              <React.Fragment key={step.label}>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                    style={{
                      backgroundColor: step.active ? "#3B5EFF" : "rgba(26,26,46,0.08)",
                      color: step.active ? "#FFFFFF" : "rgba(26,26,46,0.35)",
                      fontFamily: "var(--font-poppins)",
                    }}
                    aria-current={step.active ? "step" : undefined}
                  >
                    {i + 1}
                  </div>
                  <span
                    className="text-[12px] font-medium"
                    style={{
                      color: step.active ? "#3B5EFF" : "rgba(26,26,46,0.35)",
                      fontFamily: "var(--font-poppins)",
                    }}
                  >
                    {step.label}
                  </span>
                </div>
                {i < 2 && (
                  <div
                    className="flex-1 h-px"
                    style={{ backgroundColor: "rgba(26,26,46,0.10)" }}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </header>

        {/* ----------------------------------------------------------------
            Form — max-width 640px, satu kolom (DESIGN.md §3.2)
        ---------------------------------------------------------------- */}
        <BriefForm />

      </div>
    </div>
  );
}

// React import untuk Fragment
import React from "react";
