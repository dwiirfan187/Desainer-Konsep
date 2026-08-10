import React from "react";
import { Button } from "@/components/ui/button";

/**
 * LandingNav — Navigasi utama (DESIGN.md §3.1)
 * Clean & lurus, tanpa tilt sama sekali — nav harus tetap usable (§1.4)
 */
export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Backdrop blur untuk keterbacaan saat scroll */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "rgba(250,247,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(26,26,46,0.08)",
        }}
        aria-hidden="true"
      />

      <nav
        className="relative max-w-6xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between"
        aria-label="Navigasi utama"
      >
        {/* Logo */}
        <a
          href="/"
          className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#3B5EFF] rounded-[4px]"
          aria-label="Desainer Konsep — halaman utama"
        >
          {/* Swatch mini sebagai logo mark */}
          <div className="flex rounded-[6px] overflow-hidden h-7 w-7 border border-[rgba(26,26,46,0.12)] flex-shrink-0" aria-hidden="true">
            <div className="flex-1" style={{ backgroundColor: "#3B5EFF" }} />
            <div className="flex-1" style={{ backgroundColor: "#FFB100" }} />
            <div className="flex-1" style={{ backgroundColor: "#FF5C7A" }} />
          </div>
          <span
            className="text-[15px] font-bold"
            style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
          >
            Desainer{" "}
            <span
              style={{
                fontFamily: "var(--font-caveat)",
                color: "#3B5EFF",
                fontSize: "1.1em",
              }}
            >
              Konsep
            </span>
          </span>
        </a>

        {/* Nav links + CTA */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="#cara-kerja"
            className="hidden sm:inline-flex items-center text-[14px] font-medium px-3 py-1.5 rounded-[8px] transition-colors hover:bg-[rgba(26,26,46,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF]"
            style={{ color: "rgba(26,26,46,0.7)", fontFamily: "var(--font-poppins)" }}
          >
            Cara Kerja
          </a>
          <a
            href="/history"
            className="hidden sm:inline-flex items-center text-[14px] font-medium px-3 py-1.5 rounded-[8px] transition-colors hover:bg-[rgba(26,26,46,0.06)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF]"
            style={{ color: "rgba(26,26,46,0.7)", fontFamily: "var(--font-poppins)" }}
          >
            Riwayat
          </a>
          <Button variant="outline" size="sm" asChild>
            <a href="/login">Masuk</a>
          </Button>
          <Button variant="primary" size="sm" asChild>
            <a href="/brief">Coba Gratis</a>
          </Button>
        </div>
      </nav>
    </header>
  );
}
