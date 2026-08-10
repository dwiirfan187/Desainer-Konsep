import React from "react";
import { SwatchCard } from "@/components/ui/swatch-card";
import { Button } from "@/components/ui/button";

/**
 * LandingShowcase — Section contoh hasil Swatch Card (DESIGN.md §3.1)
 *
 * Menampilkan real example output yang bisa user harapkan.
 * Grid 3 kartu, tilt berbeda, jadi "bukti langsung" apa yang didapat.
 */

const SHOWCASE_CARDS = [
  {
    title: "Marigold Market Fest",
    description:
      "Poster festival pasar UMKM. Energi tinggi dengan kuning marigold sebagai hero color, tipografi condensed bold, ilustrasi garis hitam tegas.",
    palette: ["#FFB100", "#FF5C7A", "#1A1A2E", "#FAF7FF"],
    categoryTag: "poster ✦",
    tilt: -1 as const,
    accentColor: "#FFB100",
  },
  {
    title: "Minimal Skincare Feed",
    description:
      "Feed Instagram produk skincare lokal. Clean, off-white, detail produk jadi hero. Tipografi serif kecil untuk label, banyak breathing room.",
    palette: ["#FAF7FF", "#2FBF8F", "#1A1A2E", "#FFFFFF"],
    categoryTag: "feed ✦",
    tilt: 2 as const,
    accentColor: "#2FBF8F",
  },
  {
    title: "Violet Studio Mark",
    description:
      "Logo untuk desain studio kreatif. Monogram geometris, violet sebagai warna brand, balance antara playful dan profesional.",
    palette: ["#8B5CF6", "#1A1A2E", "#FAF7FF", "#FFB100"],
    categoryTag: "logo ✦",
    tilt: -2 as const,
    accentColor: "#8B5CF6",
  },
];

export function LandingShowcase() {
  return (
    <section
      className="py-20 md:py-28"
      aria-labelledby="showcase-heading"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div>
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: "#2FBF8F", fontFamily: "var(--font-poppins)" }}
            >
              Contoh Hasil
            </span>
            <h2
              id="showcase-heading"
              className="mt-1.5 text-[28px] md:text-[34px] font-bold leading-tight"
              style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
            >
              Ini yang kamu akan dapat.
            </h2>
            <p
              className="mt-2 text-[15px] leading-relaxed max-w-md"
              style={{
                color: "rgba(26,26,46,0.6)",
                fontFamily: "var(--font-poppins)",
              }}
            >
              Bukan deskripsi panjang atau template generic — tapi konsep yang
              sudah punya arah visual jelas dan prompt yang siap dipakai.
            </p>
          </div>

          <Button variant="outline" size="md" asChild>
            <a href="/brief">Coba sekarang →</a>
          </Button>
        </div>

        {/* Grid showcase — tilt berbeda per kartu (§1.4, §3.3) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
          {SHOWCASE_CARDS.map((card, i) => (
            <SwatchCard
              key={i}
              title={card.title}
              description={card.description}
              palette={card.palette}
              categoryTag={card.categoryTag}
              tilt={card.tilt}
              accentColor={card.accentColor}
            />
          ))}
        </div>

        {/* Catatan prompt */}
        <div className="mt-10 flex items-center gap-3">
          <div
            className="h-px flex-1"
            style={{ backgroundColor: "rgba(26,26,46,0.08)" }}
          />
          <p
            className="text-[13px] text-center"
            style={{
              color: "rgba(26,26,46,0.4)",
              fontFamily: "var(--font-poppins)",
            }}
          >
            Tiap konsep di atas dilengkapi prompt siap pakai untuk ChatGPT, Midjourney, dan DALL-E
          </p>
          <div
            className="h-px flex-1"
            style={{ backgroundColor: "rgba(26,26,46,0.08)" }}
          />
        </div>

      </div>
    </section>
  );
}
