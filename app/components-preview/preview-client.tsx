"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip, ChipGroup } from "@/components/ui/chip";
import { SwatchCard } from "@/components/ui/swatch-card";
import { LoadingSwatchSkeleton } from "@/components/ui/loading-swatch-skeleton";
import type { ChipColor } from "@/components/ui/chip";

// ---------------------------------------------------------------------------
// Data sample untuk preview
// ---------------------------------------------------------------------------

const MOOD_OPTIONS: Array<{
  value: string;
  label: string;
  emoji: string;
  color: ChipColor;
}> = [
  { value: "hangat", label: "Hangat", emoji: "🌅", color: "secondary" },
  { value: "minimalis", label: "Minimalis", emoji: "◻️", color: "primary" },
  { value: "playful", label: "Playful", emoji: "🎉", color: "coral" },
  { value: "elegan", label: "Elegan", emoji: "✨", color: "violet" },
  { value: "fresh", label: "Fresh", emoji: "🌿", color: "green" },
  { value: "bold", label: "Bold", emoji: "⚡", color: "coral" },
  { value: "retro", label: "Retro", emoji: "📼", color: "violet" },
  { value: "natural", label: "Natural", emoji: "🍃", color: "green" },
];

const SAMPLE_CARDS = [
  {
    title: "Cobalt Flat Study",
    description:
      "Komposisi geometris dengan dominasi cobalt blue dan aksen marigold. Gaya Swiss International Typographic dengan grid ketat dan whitespace yang bernafas.",
    palette: ["#3B5EFF", "#FFB100", "#FAF7FF", "#1A1A2E"],
    categoryTag: "poster ✦",
    tilt: -2 as const,
    accentColor: "#3B5EFF",
  },
  {
    title: "Risograph Coral",
    description:
      "Tekstur risograph dengan overlap warna coral dan violet. Imperfeksi yang disengaja: misregistrasi ringan, grain kertas, dan halftone dot di shadow.",
    palette: ["#FF5C7A", "#8B5CF6", "#FFB100", "#FFFFFF"],
    categoryTag: "feed ✦",
    tilt: 1 as const,
    accentColor: "#FF5C7A",
  },
  {
    title: "Grass & Ink",
    description:
      "Palet segar berbasis hijau padang rumput. Mengutamakan negative space besar dengan teks ink gelap yang tegas sebagai elemen utama.",
    palette: ["#2FBF8F", "#1A1A2E", "#FAF7FF", "#FFB100"],
    categoryTag: "logo ✦",
    tilt: 0 as const,
    accentColor: "#2FBF8F",
  },
];

// ---------------------------------------------------------------------------
// Section header helper
// ---------------------------------------------------------------------------
function SectionHeader({
  label,
  title,
  color,
}: {
  label: string;
  title: string;
  color: string;
}) {
  return (
    <div className="mb-6">
      <span
        className="text-xs font-semibold uppercase tracking-widest font-[family-name:var(--font-poppins)]"
        style={{ color }}
      >
        {label}
      </span>
      <h2 className="mt-1 text-xl font-bold text-[#1A1A2E] font-[family-name:var(--font-poppins)]">
        {title}
      </h2>
    </div>
  );
}

function Divider() {
  return <hr className="border-[rgba(26,26,46,0.10)] my-14" />;
}

// ---------------------------------------------------------------------------
// Main Preview Component
// ---------------------------------------------------------------------------
export default function PreviewClient() {
  const [selectedChips, setSelectedChips] = useState<string[]>(["hangat", "playful"]);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAF7FF] px-6 py-12">
      <div className="max-w-3xl mx-auto">

        {/* ================================================================
            PAGE HEADER
        ================================================================ */}
        <div className="mb-14">
          <span
            className="text-xs font-semibold uppercase tracking-widest text-[#3B5EFF] font-[family-name:var(--font-poppins)]"
          >
            Design System
          </span>
          <h1 className="mt-2 text-4xl font-extrabold text-[#1A1A2E] leading-tight font-[family-name:var(--font-poppins)]">
            Components Preview
          </h1>
          <p className="mt-3 text-base text-[rgba(26,26,46,0.6)] font-[family-name:var(--font-poppins)]">
            Semua komponen UI yang dibangun sesuai{" "}
            <code className="text-sm bg-[rgba(59,94,255,0.08)] text-[#3B5EFF] px-1.5 py-0.5 rounded-[4px]">
              DESIGN.md
            </code>{" "}
            — warna, radius, shadow, dan motion sesuai token.
          </p>
        </div>

        {/* ================================================================
            SECTION 1 — BUTTON
        ================================================================ */}
        <section aria-labelledby="section-button">
          <SectionHeader
            label="Komponen 01"
            title="Button"
            color="#3B5EFF"
          />

          {/* Variant row */}
          <div className="space-y-6">
            {/* Primary */}
            <div>
              <p className="text-xs font-medium text-[rgba(26,26,46,0.45)] uppercase tracking-widest mb-3 font-[family-name:var(--font-poppins)]">
                Primary — CTA utama
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="primary" size="sm">Coba Gratis</Button>
                <Button variant="primary" size="md">Generate Konsep →</Button>
                <Button variant="primary" size="lg">Mulai Brainstorm</Button>
                <Button variant="primary" disabled>Disabled</Button>
              </div>
            </div>

            {/* Secondary */}
            <div>
              <p className="text-xs font-medium text-[rgba(26,26,46,0.45)] uppercase tracking-widest mb-3 font-[family-name:var(--font-poppins)]">
                Secondary — highlight/playful
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="secondary" size="sm">Copy Prompt</Button>
                <Button variant="secondary" size="md">Salin ke Clipboard ✓</Button>
                <Button variant="secondary" size="lg">Simpan Konsep</Button>
                <Button variant="secondary" disabled>Disabled</Button>
              </div>
            </div>

            {/* Outline */}
            <div>
              <p className="text-xs font-medium text-[rgba(26,26,46,0.45)] uppercase tracking-widest mb-3 font-[family-name:var(--font-poppins)]">
                Outline — aksi sekunder
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button variant="outline" size="sm">Generate Ulang</Button>
                <Button variant="outline" size="md">Lihat Riwayat</Button>
                <Button variant="outline" size="lg">Kembali ke Brief</Button>
                <Button variant="outline" disabled>Disabled</Button>
              </div>
            </div>
          </div>
        </section>

        <Divider />

        {/* ================================================================
            SECTION 2 — CHIP / MOOD TAG SELECTOR
        ================================================================ */}
        <section aria-labelledby="section-chip">
          <SectionHeader
            label="Komponen 02"
            title="Chip — Mood/Vibe Selector"
            color="#FF5C7A"
          />

          <p className="text-sm text-[rgba(26,26,46,0.55)] mb-5 font-[family-name:var(--font-poppins)]">
            Klik chip untuk toggle selected state. Terpilih:{" "}
            <span className="font-semibold text-[#1A1A2E]">
              {selectedChips.length === 0
                ? "belum ada"
                : selectedChips.join(", ")}
            </span>
          </p>

          {/* Individual chips — showcase warna */}
          <div className="mb-6 space-y-3">
            <p className="text-xs font-medium text-[rgba(26,26,46,0.45)] uppercase tracking-widest font-[family-name:var(--font-poppins)]">
              Per warna token
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip color="primary" label="Primary" selected />
              <Chip color="secondary" label="Secondary" selected />
              <Chip color="coral" label="Coral" selected />
              <Chip color="green" label="Green" selected />
              <Chip color="violet" label="Violet" selected />
            </div>
            <div className="flex flex-wrap gap-2">
              <Chip color="primary" label="Primary" />
              <Chip color="secondary" label="Secondary" />
              <Chip color="coral" label="Coral" />
              <Chip color="green" label="Green" />
              <Chip color="violet" label="Violet" />
            </div>
          </div>

          {/* ChipGroup interaktif */}
          <div>
            <p className="text-xs font-medium text-[rgba(26,26,46,0.45)] uppercase tracking-widest mb-3 font-[family-name:var(--font-poppins)]">
              ChipGroup interaktif (mood selector)
            </p>
            <ChipGroup
              options={MOOD_OPTIONS}
              value={selectedChips}
              onChange={setSelectedChips}
            />
          </div>
        </section>

        <Divider />

        {/* ================================================================
            SECTION 3 — SWATCH CARD
        ================================================================ */}
        <section aria-labelledby="section-swatchcard">
          <SectionHeader
            label="Komponen 03"
            title="SwatchCard — Signature Element"
            color="#8B5CF6"
          />

          <p className="text-sm text-[rgba(26,26,46,0.55)] mb-6 font-[family-name:var(--font-poppins)]">
            Klik kartu untuk pilih. Hover untuk lihat lift + de-tilt. Tiap kartu
            punya tilt awal berbeda dan shadow tinted dari warna dominannya.
          </p>

          {/* Grid kartu — tilt berbeda seperti di §1.4 & §3.3 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SAMPLE_CARDS.map((card, i) => (
              <SwatchCard
                key={i}
                title={card.title}
                description={card.description}
                palette={card.palette}
                categoryTag={card.categoryTag}
                tilt={card.tilt}
                accentColor={card.accentColor}
                selected={selectedCard === i}
                onClick={() =>
                  setSelectedCard(selectedCard === i ? null : i)
                }
                action={
                  <Button variant="primary" size="sm">
                    Pilih Konsep Ini
                  </Button>
                }
              />
            ))}
          </div>

          {selectedCard !== null && (
            <p className="mt-4 text-sm text-[rgba(26,26,46,0.55)] font-[family-name:var(--font-poppins)]">
              Dipilih:{" "}
              <span className="font-semibold text-[#1A1A2E]">
                {SAMPLE_CARDS[selectedCard].title}
              </span>
            </p>
          )}

          {/* SwatchCard tanpa tilt & tanpa action — versi riwayat (§3.5) */}
          <div className="mt-8">
            <p className="text-xs font-medium text-[rgba(26,26,46,0.45)] uppercase tracking-widest mb-4 font-[family-name:var(--font-poppins)]">
              Versi riwayat — tilt = 0, tanpa action slot
            </p>
            <div className="max-w-xs">
              <SwatchCard
                title="Banner Marigold Pop"
                description="Energi tinggi dengan kuning marigold sebagai hero color. Cocok untuk brand F&B atau event."
                palette={["#FFB100", "#FF5C7A", "#1A1A2E", "#FAF7FF"]}
                categoryTag="banner ✦"
                tilt={0}
                accentColor="#FFB100"
              />
            </div>
          </div>
        </section>

        <Divider />

        {/* ================================================================
            SECTION 4 — LOADING SWATCH SKELETON
        ================================================================ */}
        <section aria-labelledby="section-skeleton">
          <SectionHeader
            label="Komponen 04"
            title="LoadingSwatchSkeleton"
            color="#2FBF8F"
          />

          <p className="text-sm text-[rgba(26,26,46,0.55)] mb-5 font-[family-name:var(--font-poppins)]">
            Shimmer warna-warni saat AI sedang generate konsep — bukan spinner
            abu-abu generic. Strip atas menggunakan gradient palet Art Supply.
          </p>

          <div className="mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowSkeleton(true);
                setTimeout(() => setShowSkeleton(false), 3000);
              }}
            >
              {showSkeleton ? "Sedang loading…" : "▶ Simulasi loading (3 detik)"}
            </Button>
          </div>

          {/* Grid skeleton — tilt berbeda per kartu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <LoadingSwatchSkeleton tilt={-2} />
            <LoadingSwatchSkeleton tilt={1} />
            <LoadingSwatchSkeleton tilt={0} />
          </div>
        </section>

        <Divider />

        {/* ================================================================
            SECTION 5 — DESIGN TOKENS REFERENCE
        ================================================================ */}
        <section aria-labelledby="section-tokens">
          <SectionHeader
            label="Referensi"
            title="Design Tokens — Palet Art Supply"
            color="#FFB100"
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { name: "bg", hex: "#FAF7FF", label: "--color-bg" },
              { name: "ink", hex: "#1A1A2E", label: "--color-ink" },
              { name: "primary", hex: "#3B5EFF", label: "--color-primary" },
              { name: "secondary", hex: "#FFB100", label: "--color-secondary" },
              { name: "coral", hex: "#FF5C7A", label: "--color-accent-coral" },
              { name: "green", hex: "#2FBF8F", label: "--color-accent-green" },
              { name: "violet", hex: "#8B5CF6", label: "--color-accent-violet" },
              { name: "surface", hex: "#FFFFFF", label: "--color-surface" },
            ].map((token) => (
              <div
                key={token.name}
                className="rounded-[12px] overflow-hidden border border-[rgba(26,26,46,0.10)] bg-white"
              >
                <div
                  className="h-12 w-full"
                  style={{ backgroundColor: token.hex }}
                />
                <div className="px-2.5 py-2">
                  <p className="text-[11px] font-semibold text-[#1A1A2E] font-[family-name:var(--font-poppins)]">
                    {token.name}
                  </p>
                  <p className="text-[10px] text-[rgba(26,26,46,0.45)] font-[family-name:var(--font-poppins)] mt-0.5">
                    {token.hex}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-[rgba(26,26,46,0.10)] text-center">
          <p className="text-xs text-[rgba(26,26,46,0.35)] font-[family-name:var(--font-poppins)]">
            Halaman preview sementara — hanya untuk development.
            Akan dihapus sebelum production.
          </p>
        </div>

      </div>
    </div>
  );
}
