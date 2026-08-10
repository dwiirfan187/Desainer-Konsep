import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button — sesuai DESIGN.md §1.1 & §3.2
 *
 * Variant:
 *  - primary  : background cobalt (#3B5EFF), teks putih — CTA utama
 *  - secondary: background marigold (#FFB100), teks ink — highlight/playful
 *  - outline  : border ink, background transparan — aksi sekunder
 *
 * Semua variant punya:
 *  - border-radius 10px (--radius-input)
 *  - micro-interaction bounce ringan saat active (§3.2)
 *  - visible focus state 2px outline primary (§6)
 *  - shadow tinted sesuai warna token (§1.3), bukan shadow abu-abu generic
 */
const buttonVariants = cva(
  // Base styles — shared across all variants
  [
    "inline-flex items-center justify-center gap-2",
    "rounded-[10px] px-5 py-2.5",
    "text-sm font-semibold leading-none whitespace-nowrap",
    "font-[family-name:var(--font-poppins)]",
    "border border-transparent",
    "transition-all duration-[150ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
    // Bounce ringan saat diklik (§3.2)
    "active:scale-[0.96] active:duration-[100ms]",
    // Focus visible (§6)
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF]",
    // Disabled
    "disabled:pointer-events-none disabled:opacity-40",
    // Cursor
    "cursor-pointer select-none",
  ],
  {
    variants: {
      variant: {
        /**
         * Primary — cobalt blue, shadow tinted biru (§1.3)
         * Teks putih aman secara kontras di atas #3B5EFF (WCAG AA ✓)
         */
        primary: [
          "bg-[#3B5EFF] text-white",
          "border-[#3B5EFF]",
          "shadow-[0_4px_16px_rgba(59,94,255,0.25)]",
          "hover:bg-[#2a4de8] hover:shadow-[0_6px_20px_rgba(59,94,255,0.35)]",
          "hover:-translate-y-[2px]",
        ],
        /**
         * Secondary — marigold kuning, teks ink (§1.1 catatan: teks gelap di atas warna terang)
         * Teks #1A1A2E di atas #FFB100 aman secara kontras (WCAG AA ✓)
         */
        secondary: [
          "bg-[#FFB100] text-[#1A1A2E]",
          "border-[#FFB100]",
          "shadow-[0_4px_16px_rgba(255,177,0,0.3)]",
          "hover:bg-[#e8a000] hover:shadow-[0_6px_20px_rgba(255,177,0,0.4)]",
          "hover:-translate-y-[2px]",
        ],
        /**
         * Outline — border ink, background transparan
         * Dipakai untuk aksi sekunder seperti "Generate Ulang" (§3.3)
         */
        outline: [
          "bg-transparent text-[#1A1A2E]",
          "border-[rgba(26,26,46,0.25)]",
          "shadow-none",
          "hover:bg-[rgba(26,26,46,0.05)] hover:border-[rgba(26,26,46,0.45)]",
          "hover:-translate-y-[1px]",
        ],
      },
      size: {
        sm: "text-xs px-3.5 py-2 rounded-[8px]",
        md: "text-sm px-5 py-2.5",
        lg: "text-base px-7 py-3.5 rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render sebagai child component (Radix Slot pattern) */
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
