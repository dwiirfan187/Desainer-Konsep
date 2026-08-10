"use client";

import React, { useEffect, useState } from "react";
import { SwatchCard } from "@/components/ui/swatch-card";
import { Button } from "@/components/ui/button";

/**
 * LandingHero — Hero section halaman landing
 *
 * Animasi "jatuh & settle" pada Swatch Card sesuai DESIGN.md §4:
 * - Setiap kartu muncul dengan translateY(-24px) + tilt awal, lalu settle ke posisi
 * - Staggered: kartu ke-n mulai setelah (n × 120ms)
 * - Durasi total 3 kartu = ~680ms, di bawah batas <1s
 * - Respects prefers-reduced-motion: kartu langsung muncul tanpa animasi
 */

// Data showcase kartu hero — 3 kartu overlap-tilt
const HERO_CARDS = [
  {
    title: "Cobalt Flat Study",
    description: "Grid ketat, whitespace bernafas, Swiss typography.",
    palette: ["#3B5EFF", "#FFB100", "#FAF7FF", "#1A1A2E"],
    categoryTag: "poster ✦",
    tilt: -2 as const,
    accentColor: "#3B5EFF",
  },
  {
    title: "Risograph Coral",
    description: "Tekstur risograph, overlap warna, imperfeksi disengaja.",
    palette: ["#FF5C7A", "#8B5CF6", "#FFB100", "#FFFFFF"],
    categoryTag: "feed ✦",
    tilt: 1 as const,
    accentColor: "#FF5C7A",
  },
  {
    title: "Grass & Ink",
    description: "Hijau padang rumput, teks ink tegas, negative space besar.",
    palette: ["#2FBF8F", "#1A1A2E", "#FAF7FF", "#FFB100"],
    categoryTag: "logo ✦",
    tilt: -1 as const,
    accentColor: "#2FBF8F",
  },
];

export function LandingHero() {
  // Tiap index = kartu yang sudah "settle" (visible)
  const [settled, setSettled] = useState<boolean[]>([false, false, false]);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    // Cek prefers-reduced-motion
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReduced(mq.matches);

    if (mq.matches) {
      // Langsung tampil semua tanpa animasi
      setSettled([true, true, true]);
      return;
    }

    // Stagger: tiap kartu settle setelah delay berbeda
    const delays = [80, 200, 340]; // ms — total durasi ~680ms
    const timers = delays.map((delay, i) =>
      window.setTimeout(() => {
        setSettled((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, delay)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section className="relative overflow-hidden pt-20 pb-16 md:pt-28 md:pb-24">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

          {/* ----------------------------------------------------------------
              COPY — kiri/atas
          ---------------------------------------------------------------- */}
          <div className="max-w-xl">
            {/* Eyebrow label */}
            <span
              className="inline-block text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ color: "#3B5EFF", fontFamily: "var(--font-poppins)" }}
            >
              AI Co-pilot untuk desainer visual
            </span>

            {/* H1 — DESIGN.md §1.2: 48–64px, Poppins ExtraBold */}
            <h1
              className="text-[44px] md:text-[56px] lg:text-[60px] font-extrabold leading-[1.05] tracking-[-0.02em]"
              style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
            >
              Dari brief ke{" "}
              <span style={{ color: "#3B5EFF" }}>prompt</span>{" "}
              yang gak kelihatan{" "}
              <span
                style={{
                  color: "#FF5C7A",
                  fontFamily: "var(--font-caveat)",
                  fontSize: "1.05em",
                  fontWeight: 700,
                }}
              >
                AI banget.
              </span>
            </h1>

            {/* Subheading */}
            <p
              className="mt-5 text-[17px] md:text-[18px] leading-relaxed"
              style={{
                color: "rgba(26,26,46,0.65)",
                fontFamily: "var(--font-poppins)",
              }}
            >
              Ceritain brief singkat kamu — mau bikin poster, feed, logo, atau
              banner — dan dapatkan 3–5 konsep desain matang lengkap dengan
              prompt yang langsung bisa ditempel ke ChatGPT atau Midjourney.
            </p>

            {/* CTA buttons */}
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="primary" size="lg" asChild>
                <a href="/brief">Coba Gratis →</a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <a href="#cara-kerja">Lihat cara kerjanya</a>
              </Button>
            </div>

            {/* Social proof micro-copy */}
            <p
              className="mt-5 text-xs"
              style={{
                color: "rgba(26,26,46,0.4)",
                fontFamily: "var(--font-poppins)",
              }}
            >
              Tidak perlu daftar dulu · Langsung coba · Gratis untuk 5 konsep pertama
            </p>
          </div>

          {/* ----------------------------------------------------------------
              VISUAL — kanan/bawah: tumpukan 3 Swatch Card overlap-tilt
              Animasi jatuh & settle staggered (DESIGN.md §4)
          ---------------------------------------------------------------- */}
          <div
            className="relative h-[340px] md:h-[380px] flex items-center justify-center lg:justify-end"
            aria-hidden="true"
          >
            {HERO_CARDS.map((card, i) => {
              const isSettled = settled[i];

              // Posisi overlap: kartu ditata manual supaya terlihat bertumpuk
              const positions = [
                // Kartu belakang-kiri
                { right: "28%", top: "12%", zIndex: 1 },
                // Kartu tengah
                { right: "14%", top: "5%", zIndex: 2 },
                // Kartu depan-kanan
                { right: "0%", top: "18%", zIndex: 3 },
              ];

              const pos = positions[i];

              return (
                <div
                  key={i}
                  className="absolute w-48 md:w-52"
                  style={{
                    ...pos,
                    // Animasi jatuh & settle (§4)
                    opacity: isSettled ? 1 : 0,
                    transform: isSettled
                      ? `rotate(${card.tilt}deg) translateY(0px)`
                      : `rotate(${card.tilt}deg) translateY(-28px)`,
                    transition: prefersReduced
                      ? "none"
                      : "opacity 300ms ease-out, transform 480ms cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                >
                  <SwatchCard
                    title={card.title}
                    description={card.description}
                    palette={card.palette}
                    categoryTag={card.categoryTag}
                    tilt={card.tilt}
                    accentColor={card.accentColor}
                  />
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
