"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Chip / Mood Tag Selector — sesuai DESIGN.md §3.2
 *
 * Dipakai sebagai multi-select untuk pilih mood/vibe di form brief.
 * Tiap chip punya warna sendiri dari palet §1.1 — bukan chip abu-abu generic.
 *
 * Warna preset (mood) tersedia via `color` prop:
 *   "primary"  → cobalt blue   (#3B5EFF) — mood: minimalis, profesional
 *   "secondary"→ marigold      (#FFB100) — mood: hangat, energik
 *   "coral"    → coral pink    (#FF5C7A) — mood: playful, fun
 *   "green"    → grass green   (#2FBF8F) — mood: fresh, natural
 *   "violet"   → violet        (#8B5CF6) — mood: elegan, misterius
 *
 * State:
 *   - idle: background warna di 15% opacity, border warna di 30% opacity, teks warna
 *   - selected: background warna penuh, teks putih/ink (kontras), shadow tinted
 *   - hover: background warna di 25% opacity
 *   - focus-visible: outline 2px primary (§6)
 */

export type ChipColor = "primary" | "secondary" | "coral" | "green" | "violet";

const colorConfig: Record<
  ChipColor,
  {
    hex: string;
    shadow: string;
    /** teks saat selected — ink untuk warna terang (secondary), putih untuk warna gelap */
    selectedText: string;
  }
> = {
  primary: {
    hex: "#3B5EFF",
    shadow: "0 4px 12px rgba(59,94,255,0.3)",
    selectedText: "#FFFFFF",
  },
  secondary: {
    hex: "#FFB100",
    shadow: "0 4px 12px rgba(255,177,0,0.35)",
    selectedText: "#1A1A2E",
  },
  coral: {
    hex: "#FF5C7A",
    shadow: "0 4px 12px rgba(255,92,122,0.3)",
    selectedText: "#FFFFFF",
  },
  green: {
    hex: "#2FBF8F",
    shadow: "0 4px 12px rgba(47,191,143,0.3)",
    selectedText: "#FFFFFF",
  },
  violet: {
    hex: "#8B5CF6",
    shadow: "0 4px 12px rgba(139,92,246,0.3)",
    selectedText: "#FFFFFF",
  },
};

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Warna chip dari palet §1.1 */
  color?: ChipColor;
  /** State terpilih */
  selected?: boolean;
  /** Label chip */
  label: string;
  /** Emoji opsional di depan label */
  emoji?: string;
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  (
    { color = "primary", selected = false, label, emoji, className, ...props },
    ref
  ) => {
    const cfg = colorConfig[color];

    return (
      <button
        ref={ref}
        type="button"
        role="checkbox"
        aria-checked={selected}
        className={cn(
          // Base
          "inline-flex items-center gap-1.5",
          "rounded-[8px] px-3.5 py-1.5",
          "text-sm font-medium leading-none",
          "font-[family-name:var(--font-poppins)]",
          "border",
          "cursor-pointer select-none",
          "transition-all duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          "active:scale-[0.95]",
          // Focus visible (§6)
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF]",
          className
        )}
        style={
          selected
            ? {
                backgroundColor: cfg.hex,
                borderColor: cfg.hex,
                color: cfg.selectedText,
                boxShadow: cfg.shadow,
                transform: "translateY(-1px)",
              }
            : {
                backgroundColor: `${cfg.hex}18`,
                borderColor: `${cfg.hex}40`,
                color: cfg.hex,
              }
        }
        {...props}
      >
        {emoji && (
          <span aria-hidden="true" className="text-base leading-none">
            {emoji}
          </span>
        )}
        <span>{label}</span>
      </button>
    );
  }
);
Chip.displayName = "Chip";

// ---------------------------------------------------------------------------
// ChipGroup — wrapper untuk multi-select chips dengan controlled state
// ---------------------------------------------------------------------------

export interface ChipGroupProps {
  /** Daftar opsi chip */
  options: Array<{
    value: string;
    label: string;
    emoji?: string;
    color: ChipColor;
  }>;
  /** Nilai yang sedang terpilih */
  value: string[];
  /** Callback saat pilihan berubah */
  onChange: (value: string[]) => void;
  /** Max chips yang bisa dipilih, undefined = unlimited */
  max?: number;
  className?: string;
}

function ChipGroup({ options, value, onChange, max, className }: ChipGroupProps) {
  const toggle = (v: string) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, v]);
    }
  };

  return (
    <div
      role="group"
      className={cn("flex flex-wrap gap-2", className)}
    >
      {options.map((opt) => (
        <Chip
          key={opt.value}
          color={opt.color}
          selected={value.includes(opt.value)}
          label={opt.label}
          emoji={opt.emoji}
          onClick={() => toggle(opt.value)}
        />
      ))}
    </div>
  );
}

export { Chip, ChipGroup };
