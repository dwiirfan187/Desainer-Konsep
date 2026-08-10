"use client";

import React, { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { ChipGroup } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { ImageUpload, type ImageUploadValue } from "@/components/ui/image-upload";
import { cn } from "@/lib/utils";
import {
  DESIGN_TYPE_OPTIONS,
  MOOD_OPTIONS,
  FIELD_LIMITS,
  INITIAL_FORM_VALUES,
  validateBriefForm,
  type BriefFormValues,
  type BriefFormErrors,
} from "@/lib/brief-schema";
import type {
  GenerateConceptSuccess,
  GenerateConceptError,
} from "@/app/api/generate-concept/route";

// ---------------------------------------------------------------------------
// Sub-komponen internal — FieldLabel, FieldError, CharCount
// ---------------------------------------------------------------------------

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[14px] font-semibold mb-1.5"
      style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
    >
      {children}
      {required && (
        <span
          className="ml-1 text-[#FF5C7A]"
          aria-label="wajib diisi"
          title="Wajib diisi"
        >
          *
        </span>
      )}
    </label>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[12px] mb-2 leading-snug"
      style={{ color: "rgba(26,26,46,0.5)", fontFamily: "var(--font-poppins)" }}
    >
      {children}
    </p>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="mt-1.5 text-[12px] font-medium flex items-center gap-1"
      style={{ color: "#FF5C7A", fontFamily: "var(--font-poppins)" }}
    >
      <span aria-hidden="true">⚠</span> {message}
    </p>
  );
}

function CharCount({
  current,
  max,
  error,
}: {
  current: number;
  max: number;
  error?: boolean;
}) {
  const near = current / max > 0.8;
  return (
    <span
      className="text-[11px] tabular-nums"
      style={{
        color: error
          ? "#FF5C7A"
          : near
          ? "#FFB100"
          : "rgba(26,26,46,0.35)",
        fontFamily: "var(--font-poppins)",
      }}
    >
      {current}/{max}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Input & Textarea base styles
// ---------------------------------------------------------------------------
const inputBase =
  "w-full rounded-[10px] border px-4 py-3 text-[14px] leading-snug font-[family-name:var(--font-poppins)] text-[#1A1A2E] placeholder:text-[rgba(26,26,46,0.35)] transition-all duration-[150ms] focus:outline-none";

const inputIdle =
  "bg-white border-[rgba(26,26,46,0.15)] focus:border-[#3B5EFF] focus:shadow-[0_0_0_3px_rgba(59,94,255,0.12)]";

const inputError =
  "border-[#FF5C7A] focus:border-[#FF5C7A] focus:shadow-[0_0_0_3px_rgba(255,92,122,0.12)]";

// ---------------------------------------------------------------------------
// Komponen utama: BriefForm
// ---------------------------------------------------------------------------
export function BriefForm() {
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  const router = useRouter();
  const [values, setValues] = useState<BriefFormValues>(INITIAL_FORM_VALUES);
  const [errors, setErrors] = useState<BriefFormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof BriefFormValues, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  // State gambar referensi — dikelola terpisah dari BriefFormValues karena File tidak JSON-serializable
  const [imageValue, setImageValue] = useState<ImageUploadValue | null>(null);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Field setters
  const setField = <K extends keyof BriefFormValues>(key: K, value: BriefFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Validasi live setelah field pernah disentuh
    if (touched[key]) {
      const next = { ...values, [key]: value };
      const errs = validateBriefForm(next);
      setErrors((prev) => ({ ...prev, [key]: errs[key] }));
    }
  };

  const markTouched = (key: keyof BriefFormValues) => {
    if (!touched[key]) {
      setTouched((prev) => ({ ...prev, [key]: true }));
      // Validasi saat blur
      const errs = validateBriefForm(values);
      setErrors((prev) => ({ ...prev, [key]: errs[key] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark semua field sebagai touched
    const allTouched = Object.keys(values).reduce(
      (acc, k) => ({ ...acc, [k]: true }),
      {} as Record<keyof BriefFormValues, boolean>
    );
    setTouched(allTouched);

    // Validasi penuh
    const errs = validateBriefForm(values);
    setErrors(errs);

    const hasError = Object.keys(errs).length > 0;
    if (hasError) {
      // Fokus ke field pertama yang error
      const firstErrKey = Object.keys(errs)[0] as keyof BriefFormValues;
      document.getElementById(id(firstErrKey))?.focus();
      return;
    }

    // Submit — panggil API generate-concept
    setIsSubmitting(true);
    setApiError(null);
    setImageUploadError(null);

    try {
      // Jika ada gambar: upload dulu ke Supabase Storage
      let referenceImageUrl: string | null = null;
      if (imageValue) {
        const formData = new FormData();
        formData.append("image", imageValue.compressedBlob, "reference.jpg");

        const uploadRes = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json() as { url?: string; error?: string };

        if (!uploadRes.ok || !uploadData.url) {
          setImageUploadError(uploadData.error ?? "Gagal upload gambar. Coba lagi ya.");
          setIsSubmitting(false);
          return;
        }
        referenceImageUrl = uploadData.url;
      }

      // Simpan brief ke sessionStorage untuk kebutuhan "Generate Ulang" di halaman konsep
      try {
        sessionStorage.setItem("desainer-konsep:brief", JSON.stringify(values));
        if (referenceImageUrl) {
          sessionStorage.setItem("desainer-konsep:ref-image", referenceImageUrl);
        } else {
          sessionStorage.removeItem("desainer-konsep:ref-image");
        }
      } catch {
        // sessionStorage tidak tersedia — tidak apa-apa
      }

      const res = await fetch("/api/generate-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: values, referenceImageUrl }),
      });

      const data = (await res.json()) as GenerateConceptSuccess | GenerateConceptError;

      if (!res.ok || "error" in data) {
        setApiError((data as GenerateConceptError).error ?? "Terjadi kesalahan, coba lagi ya.");
        setIsSubmitting(false);
        return;
      }

      // Navigasi ke halaman hasil konsep
      router.push(`/concepts/${(data as GenerateConceptSuccess).requestId}`);
    } catch {
      setApiError("Koneksi bermasalah nih. Cek internet kamu terus coba lagi.");
      setIsSubmitting(false);
    }
  };

  // Tidak lagi perlu success state — langsung redirect ke /concepts/[id]

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Form brief desain"
      className="space-y-8"
    >
      {/* ================================================================
          FIELD 1 — Jenis Desain (WAJIB)
          PRD §5.1: Dropdown/Select, 4 opsi (poster/feed/logo/banner)
          Implementasi: card selector visual biar lebih engaging
      ================================================================ */}
      <fieldset>
        <legend className="sr-only">Jenis Desain</legend>
        <FieldLabel htmlFor={id("design_type")} required>
          Mau bikin desain apa?
        </FieldLabel>
        <FieldHint>Pilih kategori yang paling cocok dengan project kamu.</FieldHint>

        <div
          role="radiogroup"
          aria-required="true"
          aria-describedby={errors.design_type ? id("design_type-error") : undefined}
          className="grid grid-cols-2 gap-3"
        >
          {DESIGN_TYPE_OPTIONS.map((opt) => {
            const isSelected = values.design_type === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                id={opt.value === DESIGN_TYPE_OPTIONS[0].value ? id("design_type") : undefined}
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  setField("design_type", opt.value);
                  markTouched("design_type");
                }}
                onBlur={() => markTouched("design_type")}
                className={cn(
                  "relative text-left rounded-[14px] px-4 py-4 border-2 transition-all duration-[150ms]",
                  "cursor-pointer select-none",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF]",
                  "active:scale-[0.98]",
                  isSelected
                    ? "border-[#3B5EFF] bg-[rgba(59,94,255,0.06)] shadow-[0_4px_16px_rgba(59,94,255,0.15)]"
                    : "border-[rgba(26,26,46,0.12)] bg-white hover:border-[rgba(59,94,255,0.35)] hover:bg-[rgba(59,94,255,0.03)]"
                )}
              >
                <span className="text-2xl leading-none block mb-2" aria-hidden="true">
                  {opt.emoji}
                </span>
                <span
                  className="block text-[13px] font-semibold leading-snug"
                  style={{
                    color: isSelected ? "#3B5EFF" : "#1A1A2E",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  {opt.label}
                </span>
                <span
                  className="block text-[11px] mt-0.5 leading-snug"
                  style={{
                    color: "rgba(26,26,46,0.5)",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  {opt.description}
                </span>
                {/* Checkmark indicator */}
                {isSelected && (
                  <span
                    className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px]"
                    style={{ backgroundColor: "#3B5EFF" }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <FieldError id={id("design_type-error")} message={errors.design_type} />
      </fieldset>

      {/* ================================================================
          FIELD 2 — Topik/Tema (WAJIB)
          PRD §5.1: Text input, maks 500 karakter
      ================================================================ */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <FieldLabel htmlFor={id("topic")} required>
            Topik atau temanya apa?
          </FieldLabel>
          <CharCount
            current={values.topic.length}
            max={FIELD_LIMITS.topic}
            error={!!errors.topic}
          />
        </div>
        <FieldHint>
          Deskripsiin singkat — mis. "event musik jazz di rooftop", "produk skincare remaja lokal", "kafe buku minimalis".
        </FieldHint>
        <input
          id={id("topic")}
          type="text"
          value={values.topic}
          maxLength={FIELD_LIMITS.topic}
          placeholder="Contoh: festival kuliner jalanan anak muda di Bandung"
          aria-required="true"
          aria-invalid={!!errors.topic}
          aria-describedby={errors.topic ? id("topic-error") : undefined}
          onChange={(e) => setField("topic", e.target.value)}
          onBlur={() => markTouched("topic")}
          className={cn(inputBase, errors.topic ? inputError : inputIdle)}
        />
        <FieldError id={id("topic-error")} message={errors.topic} />
      </div>

      {/* ================================================================
          FIELD 3 — Mood/Vibe (WAJIB)
          PRD §5.1: Multi-select tag
          DESIGN.md §3.2: HARUS chip selector berwarna, bukan dropdown
      ================================================================ */}
      <fieldset>
        <legend className="sr-only">Mood / Vibe</legend>
        <div className="flex items-baseline justify-between mb-1.5">
          <FieldLabel htmlFor={id("mood_tags")} required>
            Mood atau vibenya gimana?
          </FieldLabel>
          <span
            className="text-[11px]"
            style={{ color: "rgba(26,26,46,0.4)", fontFamily: "var(--font-poppins)" }}
          >
            {values.mood_tags.length} terpilih
          </span>
        </div>
        <FieldHint>
          Boleh pilih lebih dari satu — pilih yang paling nggambarkan feel yang kamu mau.
        </FieldHint>

        <div
          id={id("mood_tags")}
          aria-required="true"
          aria-invalid={!!errors.mood_tags}
          aria-describedby={errors.mood_tags ? id("mood_tags-error") : undefined}
        >
          <ChipGroup
            options={MOOD_OPTIONS}
            value={values.mood_tags}
            onChange={(v) => {
              setField("mood_tags", v);
              markTouched("mood_tags");
            }}
          />
        </div>
        <FieldError id={id("mood_tags-error")} message={errors.mood_tags} />
      </fieldset>

      {/* ================================================================
          FIELD 4 — Target Audiens (opsional)
          PRD §5.1: Text input, nullable, maks 200 karakter
      ================================================================ */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <FieldLabel htmlFor={id("target_audience")}>
            Targetnya siapa?{" "}
            <span
              className="text-[11px] font-normal"
              style={{ color: "rgba(26,26,46,0.4)" }}
            >
              (opsional)
            </span>
          </FieldLabel>
          <CharCount
            current={values.target_audience.length}
            max={FIELD_LIMITS.target_audience}
            error={!!errors.target_audience}
          />
        </div>
        <FieldHint>
          Kalau ada target audiens spesifik — mis. "anak muda 18–25 tahun, suka street food".
        </FieldHint>
        <input
          id={id("target_audience")}
          type="text"
          value={values.target_audience}
          maxLength={FIELD_LIMITS.target_audience}
          placeholder="Contoh: mahasiswa desain 20–28 tahun"
          aria-invalid={!!errors.target_audience}
          aria-describedby={errors.target_audience ? id("target_audience-error") : undefined}
          onChange={(e) => setField("target_audience", e.target.value)}
          onBlur={() => markTouched("target_audience")}
          className={cn(inputBase, errors.target_audience ? inputError : inputIdle)}
        />
        <FieldError id={id("target_audience-error")} message={errors.target_audience} />
      </div>

      {/* ================================================================
          FIELD 5 — Warna Favorit (opsional)
          PRD §5.1: Color picker / text, nullable, maks 200 karakter
      ================================================================ */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <FieldLabel htmlFor={id("color_preference")}>
            Ada preferensi warna?{" "}
            <span
              className="text-[11px] font-normal"
              style={{ color: "rgba(26,26,46,0.4)" }}
            >
              (opsional)
            </span>
          </FieldLabel>
          <CharCount
            current={values.color_preference.length}
            max={FIELD_LIMITS.color_preference}
            error={!!errors.color_preference}
          />
        </div>
        <FieldHint>
          Tulis nama warna, kode hex, atau deskripsi — mis. "cobalt blue dan kuning marigold", "#FF5C7A", "warna-warna earth tone".
        </FieldHint>
        <input
          id={id("color_preference")}
          type="text"
          value={values.color_preference}
          maxLength={FIELD_LIMITS.color_preference}
          placeholder="Contoh: hijau sage dan krem, atau #2FBF8F"
          aria-invalid={!!errors.color_preference}
          aria-describedby={errors.color_preference ? id("color_preference-error") : undefined}
          onChange={(e) => setField("color_preference", e.target.value)}
          onBlur={() => markTouched("color_preference")}
          className={cn(inputBase, errors.color_preference ? inputError : inputIdle)}
        />
        <FieldError id={id("color_preference-error")} message={errors.color_preference} />
      </div>

      {/* ================================================================
          FIELD 6 — Referensi Tambahan (opsional)
          PRD §5.1: Textarea, nullable, maks 1000 karakter
      ================================================================ */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <FieldLabel htmlFor={id("extra_notes")}>
            Ada catatan atau referensi tambahan?{" "}
            <span
              className="text-[11px] font-normal"
              style={{ color: "rgba(26,26,46,0.4)" }}
            >
              (opsional)
            </span>
          </FieldLabel>
          <CharCount
            current={values.extra_notes.length}
            max={FIELD_LIMITS.extra_notes}
            error={!!errors.extra_notes}
          />
        </div>
        <FieldHint>
          Instruksi khusus, referensi visual, hal yang harus dihindari, atau apapun yang relevan.
        </FieldHint>
        <textarea
          id={id("extra_notes")}
          value={values.extra_notes}
          maxLength={FIELD_LIMITS.extra_notes}
          rows={4}
          placeholder="Contoh: hindari warna merah, harus ada elemen tangan/illustrated, gaya mirip iklan Jepang retro tahun 80an"
          aria-invalid={!!errors.extra_notes}
          aria-describedby={errors.extra_notes ? id("extra_notes-error") : undefined}
          onChange={(e) => setField("extra_notes", e.target.value)}
          onBlur={() => markTouched("extra_notes")}
          className={cn(
            inputBase,
            "resize-none leading-relaxed",
            errors.extra_notes ? inputError : inputIdle
          )}
        />
        <FieldError id={id("extra_notes-error")} message={errors.extra_notes} />
      </div>

      {/* ================================================================
          FIELD 7 — Gambar Referensi (opsional)
          Upload 1 gambar (JPG/PNG/WebP, maks 5MB) yang dianalisis AI
          sebagai pertimbangan visual saat generate konsep.
      ================================================================ */}
      <div>
        <FieldLabel htmlFor={`${uid}-image-input`}>
          Ada gambar referensi?{" "}
          <span className="text-[11px] font-normal" style={{ color: "rgba(26,26,46,0.4)" }}>
            (opsional)
          </span>
        </FieldLabel>
        <FieldHint>
          Upload 1 gambar yang punya vibe/mood yang kamu mau — foto, artwork, screenshot moodboard.
          AI akan analisis warna, komposisi, dan mood-nya sebagai bahan pertimbangan konsep.
        </FieldHint>
        <ImageUpload
          value={imageValue}
          onChange={(v) => {
            setImageValue(v);
            setImageUploadError(null);
          }}
          externalError={imageUploadError}
        />
      </div>

      {/* ================================================================
          SUBMIT
      ================================================================ */}
      <div className="pt-2">
        {/* API error — dari server */}
        {apiError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-4 px-4 py-3 rounded-[10px] border text-[13px] flex items-start gap-2"
            style={{
              backgroundColor: "rgba(255,92,122,0.06)",
              borderColor: "rgba(255,92,122,0.25)",
              color: "#FF5C7A",
              fontFamily: "var(--font-poppins)",
            }}
          >
            <span aria-hidden="true" className="text-base leading-none mt-0.5">😅</span>
            <span>{apiError}</span>
          </div>
        )}

        {/* Validasi error summary */}
        {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
          <div
            role="alert"
            aria-live="polite"
            className="mb-4 px-4 py-3 rounded-[10px] border text-[13px]"
            style={{
              backgroundColor: "rgba(255,92,122,0.06)",
              borderColor: "rgba(255,92,122,0.25)",
              color: "#FF5C7A",
              fontFamily: "var(--font-poppins)",
            }}
          >
            Ada {Object.keys(errors).length} field yang perlu diisi sebelum lanjut.
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting}
          className="w-full text-[15px]"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <LoadingDots />
              Lagi ngeproses brief kamu…
            </span>
          ) : (
            "Generate Konsep Desain →"
          )}
        </Button>

        <p
          className="mt-3 text-center text-[12px]"
          style={{ color: "rgba(26,26,46,0.4)", fontFamily: "var(--font-poppins)" }}
        >
          Akan generate 3–5 konsep desain lengkap dengan palet warna dan prompt siap pakai.
        </p>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Loading dots animation (submit state)
// ---------------------------------------------------------------------------
function LoadingDots() {
  return (
    <span className="flex gap-[3px] items-center" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-white inline-block loading-dot"
          style={{
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        .loading-dot {
          animation: dotBounce 1.2s ease-in-out infinite;
        }
        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .loading-dot { animation: none; opacity: 0.7; }
        }
      `}</style>
    </span>
  );
}


