import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * LoadingSwatchSkeleton — (DESIGN.md §4)
 *
 * Skeleton loading berbentuk Swatch Card dengan shimmer warna-warni.
 * BUKAN spinner generic, BUKAN shimmer abu-abu monoton.
 *
 * Shimmer dibangun dari gradient linear yang di-animate via CSS keyframes,
 * menggunakan warna-warna dari palet Art Supply (§1.1) yang diblur/transparan:
 *   primary (#3B5EFF), secondary (#FFB100), coral (#FF5C7A),
 *   green (#2FBF8F), violet (#8B5CF6)
 *
 * Struktur mengikuti SwatchCard:
 * - Strip palet di atas (warna animated)
 * - Blok judul & deskripsi (shimmer abu-abu lembut)
 * - Tag pojok bawah
 *
 * Respects prefers-reduced-motion (§4): jika reduced motion aktif,
 * shimmer diam (tanpa animasi), hanya warna pudar statis.
 */

export interface LoadingSwatchSkeletonProps {
  /** Rotasi awal kartu, sama dengan SwatchCard tilt (§1.4) */
  tilt?: -2 | -1 | 0 | 1 | 2;
  className?: string;
}

function LoadingSwatchSkeleton({
  tilt = 0,
  className,
}: LoadingSwatchSkeletonProps) {
  const FOLD = 22;

  return (
    <div
      aria-busy="true"
      aria-label="Sedang membuat konsep…"
      className={cn("relative bg-white rounded-[20px] overflow-hidden w-full", className)}
      style={{
        border: "1px solid rgba(26,26,46,0.10)",
        boxShadow: "0 4px 20px rgba(26,26,46,0.06)",
        transform: `rotate(${tilt}deg)`,
      }}
    >
      {/* ----------------------------------------------------------------
          STRIP PALET — animated shimmer warna-warni
      ---------------------------------------------------------------- */}
      <div
        className="h-10 w-full skeleton-palette-shimmer"
        style={{
          clipPath: `polygon(0 0, calc(100% - ${FOLD}px) 0, 100% ${FOLD}px, 100% 100%, 0 100%)`,
        }}
        aria-hidden="true"
      />

      {/* Fold corner */}
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: FOLD,
          height: FOLD,
          background: `linear-gradient(225deg, rgba(26,26,46,0.10) 0%, transparent 60%)`,
          clipPath: `polygon(100% 0, 0 0, 100% 100%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 pointer-events-none"
        style={{
          width: FOLD,
          height: FOLD,
          background: "#f0eef8",
          clipPath: `polygon(100% 0, 0 100%, 100% 100%)`,
        }}
      />

      {/* ----------------------------------------------------------------
          KONTEN — blok teks placeholder dengan shimmer lembut
      ---------------------------------------------------------------- */}
      <div className="px-5 pt-4 pb-6 space-y-3">
        {/* Judul */}
        <div
          className="h-4 rounded-[6px] skeleton-text-shimmer"
          style={{ width: "65%" }}
          aria-hidden="true"
        />

        {/* Deskripsi baris 1 */}
        <div
          className="h-3 rounded-[6px] skeleton-text-shimmer"
          style={{ width: "100%" }}
          aria-hidden="true"
        />
        {/* Deskripsi baris 2 */}
        <div
          className="h-3 rounded-[6px] skeleton-text-shimmer"
          style={{ width: "80%" }}
          aria-hidden="true"
        />
        {/* Deskripsi baris 3 */}
        <div
          className="h-3 rounded-[6px] skeleton-text-shimmer"
          style={{ width: "55%" }}
          aria-hidden="true"
        />

        {/* Hex swatches kecil */}
        <div className="flex gap-2 pt-1">
          {[40, 52, 44, 36].map((w, i) => (
            <div
              key={i}
              className="h-3 rounded-[4px] skeleton-text-shimmer"
              style={{ width: w }}
              aria-hidden="true"
            />
          ))}
        </div>
      </div>

      {/* Tag pojok */}
      <div className="absolute bottom-4 left-5">
        <div
          className="h-4 w-16 rounded-[4px] skeleton-text-shimmer"
          aria-hidden="true"
        />
      </div>

      {/* ----------------------------------------------------------------
          KEYFRAME STYLES — injected via <style> tag
          Tidak pakai Tailwind animate karena perlu gradient custom warna-warni
      ---------------------------------------------------------------- */}
      <SkeletonStyles />
    </div>
  );
}

/**
 * SkeletonStyles — inject CSS keyframes sekali ke DOM.
 * Dirender sebagai <style> tag di dalam komponen supaya self-contained.
 * Pada server render, ini masuk ke HTML — tidak ada flash of unstyled content.
 */
function SkeletonStyles() {
  return (
    <style>{`
      /* Shimmer warna-warni untuk strip palet (DESIGN.md §4) */
      @keyframes paletteSweep {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }

      .skeleton-palette-shimmer {
        background: linear-gradient(
          90deg,
          #3B5EFF40 0%,
          #FFB10050 15%,
          #FF5C7A40 30%,
          #2FBF8F40 45%,
          #8B5CF640 60%,
          #3B5EFF40 75%,
          #FFB10050 90%,
          #FF5C7A40 100%
        );
        background-size: 200% 100%;
        animation: paletteSweep 1.8s ease-in-out infinite;
      }

      /* Shimmer lembut untuk blok teks */
      @keyframes textShimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }

      .skeleton-text-shimmer {
        background: linear-gradient(
          90deg,
          rgba(26,26,46,0.07) 0%,
          rgba(26,26,46,0.13) 40%,
          rgba(26,26,46,0.07) 80%
        );
        background-size: 200% 100%;
        animation: textShimmer 1.6s ease-in-out infinite;
        animation-delay: 0.1s;
      }

      /* Reduced motion — matikan animasi, tampilkan warna statis */
      @media (prefers-reduced-motion: reduce) {
        .skeleton-palette-shimmer {
          animation: none;
          background: linear-gradient(
            90deg,
            #3B5EFF25,
            #FFB10025,
            #FF5C7A25,
            #2FBF8F25,
            #8B5CF625
          );
          background-size: 100% 100%;
        }
        .skeleton-text-shimmer {
          animation: none;
          background: rgba(26,26,46,0.08);
        }
      }
    `}</style>
  );
}

export { LoadingSwatchSkeleton };
