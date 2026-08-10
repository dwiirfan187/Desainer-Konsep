"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * SwatchCard — Signature Element (DESIGN.md §2)
 *
 * Spesifikasi dari dokumen:
 * - Strip warna palet di bagian atas (3–5 warna, sebagai swatch nyata)
 * - Sudut kanan-atas "terlipat" (CSS fold corner)
 * - Tag handwritten pojok kartu (font Caveat) — label kategori, mis. "poster ✦"
 * - Border tipis warna ink dengan radius besar (20px+)
 * - Shadow tinted dari warna dominan, bukan abu-abu generic (§1.3)
 * - Hover: lift translateY(-4px) + de-tilt ke 0° (§2)
 * - Rotasi awal -2° s/d 2° untuk feel moodboard fisik (§1.4) — via prop `tilt`
 * - Visible focus state (§6)
 * - Respects prefers-reduced-motion (§4)
 */

export interface SwatchCardProps {
  /** Judul konsep desain */
  title: string;
  /** Deskripsi gaya visual 2–3 kalimat */
  description?: string;
  /** Array hex color (3–5 warna) untuk strip palet di atas */
  palette: string[];
  /** Label kategori di tag pojok bawah-kiri (font Caveat), mis. "poster ✦" */
  categoryTag?: string;
  /** Rotasi awal kartu dalam derajat (-2 s/d 2). Default: 0 */
  tilt?: -2 | -1 | 0 | 1 | 2;
  /**
   * Warna dominan untuk shadow tinted (§1.3).
   * Jika tidak diisi, diambil dari warna pertama palette.
   */
  accentColor?: string;
  /** Slot untuk tombol aksi (mis. "Pilih Konsep Ini") — muncul saat hover */
  action?: React.ReactNode;
  /** Callback saat kartu diklik */
  onClick?: () => void;
  /** Apakah kartu ini dalam state terpilih */
  selected?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const SwatchCard = React.forwardRef<HTMLDivElement, SwatchCardProps>(
  (
    {
      title,
      description,
      palette,
      categoryTag,
      tilt = 0,
      accentColor,
      action,
      onClick,
      selected = false,
      className,
      children,
    },
    ref
  ) => {
    const [hovered, setHovered] = React.useState(false);
    const isInteractive = !!onClick;

    // Warna dominan untuk shadow — pakai prop atau fallback ke warna pertama palet
    const dominant = accentColor ?? palette[0] ?? "#3B5EFF";

    // Parse hex ke rgb untuk shadow tinted
    const shadowColor = hexToRgba(dominant, 0.22);
    const shadowColorHover = hexToRgba(dominant, 0.32);

    // Ukuran fold corner (sudut terlipat kanan-atas) dalam px
    const FOLD = 22;

    const rotateStyle: React.CSSProperties = {
      "--card-tilt": `${tilt}deg`,
      transform: hovered || selected
        ? "translateY(-4px) rotate(0deg)"
        : `rotate(${tilt}deg)`,
      transition:
        "transform 250ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 250ms cubic-bezier(0.4,0,0.2,1)",
      boxShadow: hovered || selected
        ? `0 12px 32px ${shadowColorHover}, 0 2px 8px rgba(26,26,46,0.06)`
        : `0 4px 20px ${shadowColor}, 0 1px 4px rgba(26,26,46,0.05)`,
    } as React.CSSProperties;

    // Clip-path untuk fold corner kanan-atas
    // Kartu penuh → potong sudut kanan-atas membentuk segitiga
    const foldClip = `polygon(0 0, calc(100% - ${FOLD}px) 0, 100% ${FOLD}px, 100% 100%, 0 100%)`;

    return (
      <div
        ref={ref}
        role={isInteractive ? "button" : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        aria-pressed={isInteractive && selected ? true : undefined}
        onClick={onClick}
        onKeyDown={
          isInteractive
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onClick?.();
                }
              }
            : undefined
        }
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        style={rotateStyle}
        className={cn(
          // Base card
          "relative bg-white",
          "border border-[rgba(26,26,46,0.12)]",
          "rounded-[20px]",
          "overflow-hidden",
          "w-full",
          // Cursor
          isInteractive ? "cursor-pointer" : "cursor-default",
          // Focus visible (§6)
          isInteractive &&
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF]",
          // Selected ring
          selected && "ring-2 ring-[#3B5EFF] ring-offset-2",
          className
        )}
      >
        {/* ----------------------------------------------------------------
            STRIP WARNA PALET — bagian atas kartu (§2)
            Menampilkan 3–5 warna sebagai swatch nyata, bukan teks hex
        ---------------------------------------------------------------- */}
        <div
          className="flex h-10 w-full"
          role="img"
          aria-label={`Palet warna: ${palette.join(", ")}`}
          style={{
            // Clip sudut kanan-atas di strip (mengikuti fold corner kartu)
            clipPath: `polygon(0 0, calc(100% - ${FOLD}px) 0, 100% ${FOLD}px, 100% 100%, 0 100%)`,
          }}
        >
          {palette.map((hex, i) => (
            <div
              key={i}
              className="flex-1 h-full"
              style={{ backgroundColor: hex }}
              title={hex}
            />
          ))}
        </div>

        {/* ----------------------------------------------------------------
            FOLD CORNER — sudut kanan-atas terlipat (§2)
            Dibuat dari dua segitiga: shadow dan lipatan
        ---------------------------------------------------------------- */}
        {/* Bayangan fold */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 pointer-events-none"
          style={{
            width: FOLD,
            height: FOLD,
            background: `linear-gradient(225deg, rgba(26,26,46,0.18) 0%, transparent 60%)`,
            clipPath: `polygon(100% 0, 0 0, 100% 100%)`,
          }}
        />
        {/* Lipatan putih */}
        <div
          aria-hidden="true"
          className="absolute top-0 right-0 pointer-events-none"
          style={{
            width: FOLD,
            height: FOLD,
            background: `linear-gradient(225deg, #f0eef8 30%, #e2dff0 100%)`,
            clipPath: `polygon(100% 0, 0 100%, 100% 100%)`,
            borderLeft: "1px solid rgba(26,26,46,0.10)",
            borderBottom: "1px solid rgba(26,26,46,0.10)",
          }}
        />

        {/* ----------------------------------------------------------------
            KONTEN KARTU
        ---------------------------------------------------------------- */}
        <div className="px-5 pt-4 pb-6">
          {/* Judul */}
          <h3 className="text-base font-semibold text-[#1A1A2E] leading-snug font-[family-name:var(--font-poppins)] pr-2">
            {title}
          </h3>

          {/* Deskripsi */}
          {description && (
            <p className="mt-2 text-sm text-[rgba(26,26,46,0.65)] leading-relaxed font-[family-name:var(--font-poppins)]">
              {description}
            </p>
          )}

          {/* Konten tambahan dari children */}
          {children && <div className="mt-3">{children}</div>}

          {/* Hex swatch label kecil */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {palette.map((hex, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[rgba(26,26,46,0.55)] font-[family-name:var(--font-poppins)] tracking-wide"
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full border border-[rgba(26,26,46,0.15)] flex-shrink-0"
                  style={{ backgroundColor: hex }}
                  aria-hidden="true"
                />
                {hex}
              </span>
            ))}
          </div>
        </div>

        {/* ----------------------------------------------------------------
            TAG HANDWRITTEN — pojok bawah-kiri (§2)
            Font Caveat, label kategori seperti "poster ✦"
        ---------------------------------------------------------------- */}
        {categoryTag && (
          <div className="absolute bottom-4 left-5">
            <span
              className="text-[15px] font-[family-name:var(--font-caveat)] font-medium leading-none"
              style={{ color: dominant }}
            >
              {categoryTag}
            </span>
          </div>
        )}

        {/* ----------------------------------------------------------------
            ACTION SLOT — tombol aksi, muncul saat hover/focus (§3.3)
        ---------------------------------------------------------------- */}
        {action && (
          <div
            className={cn(
              "absolute bottom-4 right-4",
              "transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]",
              hovered || selected
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-1 pointer-events-none"
            )}
          >
            {action}
          </div>
        )}
      </div>
    );
  }
);
SwatchCard.displayName = "SwatchCard";

// ---------------------------------------------------------------------------
// Helper: hex → rgba string
// ---------------------------------------------------------------------------
function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(59,94,255,${alpha})`;
  return `rgba(${r},${g},${b},${alpha})`;
}

export { SwatchCard };
