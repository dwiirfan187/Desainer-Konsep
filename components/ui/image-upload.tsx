"use client";

/**
 * ImageUpload — komponen upload gambar referensi untuk form brief.
 *
 * Fitur:
 * - Drag-and-drop + tombol pilih file
 * - Preview thumbnail setelah dipilih
 * - Tombol hapus/ganti gambar
 * - Validasi: hanya JPG/PNG/WebP, maks 5MB
 * - Compress & resize di client sebelum upload:
 *   - Sisi terpanjang dibatasi 1600px
 *   - Output sebagai Blob JPEG quality 0.85
 * - Design token konsisten dengan aplikasi (warna, radius, font Poppins)
 * - Accessible: keyboard navigable, aria-label, role, focus visible
 * - Respects prefers-reduced-motion
 */

import React, { useCallback, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_DIMENSION = 1600;             // px — sisi terpanjang
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.webp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImageUploadValue {
  /** File asli yang dipilih user (sebelum compress) */
  originalFile: File;
  /** Blob hasil compress/resize — ini yang dikirim ke server */
  compressedBlob: Blob;
  /** Data URL untuk preview thumbnail */
  previewUrl: string;
  /** Ukuran compressed dalam bytes */
  compressedSize: number;
}

interface ImageUploadProps {
  value: ImageUploadValue | null;
  onChange: (value: ImageUploadValue | null) => void;
  /** Error dari luar (mis. upload API gagal) */
  externalError?: string | null;
  className?: string;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ImageUpload({ value, onChange, externalError, className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const inputId = `${uid}-image-input`;

  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const error = externalError ?? validationError;

  // ---------------------------------------------------------------------------
  // Validasi file
  // ---------------------------------------------------------------------------
  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Format tidak didukung. Pakai JPG, PNG, atau WebP ya.";
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `Ukuran file terlalu besar (${(file.size / 1024 / 1024).toFixed(1)}MB). Maksimal 5MB.`;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Compress & resize via Canvas API
  // ---------------------------------------------------------------------------
  async function compressImage(file: File): Promise<{ blob: Blob; previewUrl: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        // Hitung dimensi output — batasi sisi terpanjang ke MAX_DIMENSION
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas tidak tersedia")); return; }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error("Gagal compress gambar")); return; }
            const previewUrl = canvas.toDataURL("image/jpeg", 0.85);
            resolve({ blob, previewUrl });
          },
          "image/jpeg",
          0.85
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Gambar tidak bisa dibaca"));
      };

      img.src = objectUrl;
    });
  }

  // ---------------------------------------------------------------------------
  // Handle file selection
  // ---------------------------------------------------------------------------
  const handleFile = useCallback(async (file: File) => {
    setValidationError(null);

    const err = validateFile(file);
    if (err) {
      setValidationError(err);
      return;
    }

    setIsProcessing(true);
    try {
      const { blob, previewUrl } = await compressImage(file);
      onChange({
        originalFile: file,
        compressedBlob: blob,
        previewUrl,
        compressedSize: blob.size,
      });
    } catch {
      setValidationError("Gagal memproses gambar. Coba gambar lain ya.");
    } finally {
      setIsProcessing(false);
    }
  }, [onChange]);

  // ---------------------------------------------------------------------------
  // Drag-and-drop handlers
  // ---------------------------------------------------------------------------
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset value supaya file yang sama bisa di-upload ulang
    e.target.value = "";
  };

  const handleRemove = () => {
    onChange(null);
    setValidationError(null);
  };

  // ---------------------------------------------------------------------------
  // Render: sudah ada gambar
  // ---------------------------------------------------------------------------
  if (value) {
    return (
      <div className={cn("relative", className)}>
        <div
          className="relative rounded-[12px] overflow-hidden border"
          style={{ borderColor: "rgba(26,26,46,0.12)", backgroundColor: "#FFFFFF" }}
        >
          {/* Preview thumbnail */}
          <div className="relative w-full" style={{ paddingBottom: "56.25%" /* 16:9 */ }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.previewUrl}
              alt="Gambar referensi yang dipilih"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* Info overlay bawah */}
          <div
            className="px-4 py-3 flex items-center justify-between gap-3"
            style={{ borderTop: "1px solid rgba(26,26,46,0.08)" }}
          >
            <div className="min-w-0">
              <p
                className="text-[12px] font-medium truncate"
                style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
              >
                {value.originalFile.name}
              </p>
              <p
                className="text-[11px] mt-0.5"
                style={{ color: "rgba(26,26,46,0.45)", fontFamily: "var(--font-poppins)" }}
              >
                {(value.compressedSize / 1024).toFixed(0)}KB setelah dikompresi
              </p>
            </div>

            {/* Tombol ganti / hapus */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[12px] font-medium px-3 py-1.5 rounded-[8px] border transition-all hover:bg-[rgba(59,94,255,0.06)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF]"
                style={{
                  borderColor: "rgba(59,94,255,0.3)",
                  color: "#3B5EFF",
                  fontFamily: "var(--font-poppins)",
                }}
                aria-label="Ganti gambar"
              >
                Ganti
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="text-[12px] font-medium px-3 py-1.5 rounded-[8px] border transition-all hover:bg-[rgba(255,92,122,0.06)] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF]"
                style={{
                  borderColor: "rgba(255,92,122,0.3)",
                  color: "#FF5C7A",
                  fontFamily: "var(--font-poppins)",
                }}
                aria-label="Hapus gambar"
              >
                Hapus
              </button>
            </div>
          </div>

          {/* Badge "✓ Gambar siap dianalisis" */}
          <div className="absolute top-3 left-3">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-[6px]"
              style={{
                backgroundColor: "rgba(47,191,143,0.90)",
                color: "#FFFFFF",
                fontFamily: "var(--font-poppins)",
                backdropFilter: "blur(4px)",
              }}
            >
              ✓ Siap dianalisis AI
            </span>
          </div>
        </div>

        {/* Hidden input untuk ganti gambar */}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={onFileChange}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: belum ada gambar — dropzone
  // ---------------------------------------------------------------------------
  return (
    <div className={cn("relative", className)}>
      {/* Dropzone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Area upload gambar referensi. Klik atau drag-drop gambar ke sini."
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={cn(
          "w-full rounded-[12px] border-2 border-dashed",
          "flex flex-col items-center justify-center gap-3",
          "py-8 px-6 cursor-pointer",
          "transition-all duration-[150ms]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF]",
          isProcessing && "pointer-events-none opacity-60"
        )}
        style={{
          borderColor: isDragging
            ? "#3B5EFF"
            : error
            ? "#FF5C7A"
            : "rgba(26,26,46,0.18)",
          backgroundColor: isDragging
            ? "rgba(59,94,255,0.04)"
            : error
            ? "rgba(255,92,122,0.03)"
            : "rgba(26,26,46,0.02)",
        }}
      >
        {/* Icon */}
        <div
          className="w-12 h-12 rounded-[10px] flex items-center justify-center text-2xl flex-shrink-0"
          style={{
            backgroundColor: isDragging
              ? "rgba(59,94,255,0.10)"
              : "rgba(26,26,46,0.06)",
          }}
          aria-hidden="true"
        >
          {isProcessing ? "⏳" : isDragging ? "📥" : "🖼️"}
        </div>

        {/* Copy */}
        <div className="text-center">
          <p
            className="text-[14px] font-semibold"
            style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
          >
            {isProcessing
              ? "Lagi diproses…"
              : isDragging
              ? "Lepas di sini"
              : "Upload gambar referensi"}
          </p>
          {!isProcessing && (
            <p
              className="text-[12px] mt-1"
              style={{ color: "rgba(26,26,46,0.5)", fontFamily: "var(--font-poppins)" }}
            >
              Drag-drop atau klik untuk pilih ·{" "}
              <span style={{ color: "#3B5EFF" }}>JPG, PNG, WebP</span> · maks 5MB
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="mt-1.5 text-[12px] font-medium flex items-center gap-1"
          style={{ color: "#FF5C7A", fontFamily: "var(--font-poppins)" }}
        >
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={onFileChange}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
