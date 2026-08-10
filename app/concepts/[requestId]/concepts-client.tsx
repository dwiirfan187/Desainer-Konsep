"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SwatchCard } from "@/components/ui/swatch-card";
import { LoadingSwatchSkeleton } from "@/components/ui/loading-swatch-skeleton";
import { Button } from "@/components/ui/button";
import { getTiltForIndex, getDominantColor } from "@/lib/ai-prompt-engine";
import type { GenerateConceptSuccess, GenerateConceptError } from "@/app/api/generate-concept/route";
import type { BriefFormValues } from "@/lib/brief-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Concept {
  id: string;
  title: string;
  description: string;
  color_palette: string[];
  style_reference: string;
}

interface ConceptsClientProps {
  requestId: string;
  /** Brief asli — disimpan di sessionStorage untuk generate ulang */
  initialBrief?: BriefFormValues | null;
}

// ---------------------------------------------------------------------------
// State machine: idle → loading → success | error
// ---------------------------------------------------------------------------

type ViewState =
  | { status: "loading" }
  | { status: "success"; concepts: Concept[]; requestId: string }
  | { status: "error"; message: string; retryable: boolean };

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------

export default function ConceptsClient({ requestId, initialBrief }: ConceptsClientProps) {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ status: "loading" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [brief, setBrief] = useState<BriefFormValues | null>(initialBrief ?? null);

  // Ambil brief dari sessionStorage jika tidak diteruskan lewat props
  useEffect(() => {
    if (!brief) {
      try {
        const raw = sessionStorage.getItem("desainer-konsep:brief");
        if (raw) setBrief(JSON.parse(raw) as BriefFormValues);
      } catch {
        // sessionStorage tidak tersedia atau data korup — tidak apa-apa
      }
    }
  }, [brief]);

  // Fetch konsep dari Supabase (via API route yang sudah menyimpannya)
  const fetchConcepts = useCallback(async (reqId: string) => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/concepts/${reqId}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as Partial<GenerateConceptError>;
        setState({
          status: "error",
          message: err.error ?? "Gagal mengambil konsep. Coba generate ulang ya.",
          retryable: true,
        });
        return;
      }
      const data = await res.json() as { concepts: Concept[] };
      setState({ status: "success", concepts: data.concepts, requestId: reqId });
    } catch {
      setState({
        status: "error",
        message: "Koneksi bermasalah nih. Cek internet kamu terus coba lagi.",
        retryable: true,
      });
    }
  }, []);

  // Load awal
  useEffect(() => {
    fetchConcepts(requestId);
  }, [requestId, fetchConcepts]);

  // Generate ulang — panggil API lagi dengan brief yang sama
  const handleRegenerate = useCallback(async () => {
    if (!brief) {
      // Tidak ada brief tersimpan — balik ke form
      router.push("/brief");
      return;
    }

    setState({ status: "loading" });
    setSelectedId(null);

    try {
      const res = await fetch("/api/generate-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief,
          existingRequestId: state.status === "success" ? state.requestId : requestId,
        }),
      });

      const data = await res.json() as GenerateConceptSuccess | GenerateConceptError;

      if (!res.ok || "error" in data) {
        setState({
          status: "error",
          message: (data as GenerateConceptError).error ?? "Generate ulang gagal. Coba lagi ya.",
          retryable: true,
        });
        return;
      }

      const success = data as GenerateConceptSuccess;
      setState({ status: "success", concepts: success.concepts, requestId: success.requestId });

      // Update URL tanpa reload penuh jika requestId berubah
      if (success.requestId !== requestId) {
        window.history.replaceState(null, "", `/concepts/${success.requestId}`);
      }
    } catch {
      setState({
        status: "error",
        message: "Lagi gagal connect ke AI-nya, coba generate ulang ya.",
        retryable: true,
      });
    }
  }, [brief, requestId, router, state]);

  // Pilih konsep → navigasi ke halaman prompt
  const handleSelectConcept = useCallback((conceptId: string) => {
    setSelectedId(conceptId);
    const currentRequestId = state.status === "success" ? state.requestId : requestId;
    router.push(`/prompt/${conceptId}?requestId=${currentRequestId}`);
  }, [router, requestId, state]);

  // ----------------------------------------------------------------
  // RENDER: Loading
  // ----------------------------------------------------------------
  if (state.status === "loading") {
    return (
      <PageShell>
        <LoadingHeader />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {[0, 1, 2].map((i) => (
            <LoadingSwatchSkeleton key={i} tilt={getTiltForIndex(i)} />
          ))}
        </div>
      </PageShell>
    );
  }

  // ----------------------------------------------------------------
  // RENDER: Error
  // ----------------------------------------------------------------
  if (state.status === "error") {
    return (
      <PageShell>
        <ErrorState
          message={state.message}
          retryable={state.retryable}
          onRetry={state.retryable ? () => fetchConcepts(requestId) : undefined}
          onBack={() => router.push("/brief")}
        />
      </PageShell>
    );
  }

  // ----------------------------------------------------------------
  // RENDER: Success
  // ----------------------------------------------------------------
  const { concepts } = state;

  return (
    <PageShell>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10">
        <div>
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "#3B5EFF", fontFamily: "var(--font-poppins)" }}
          >
            Step 2 dari 3
          </span>
          <h1
            className="mt-1.5 text-[26px] md:text-[32px] font-extrabold leading-tight tracking-tight"
            style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
          >
            Pilih konsep yang{" "}
            <span
              style={{ color: "#FF5C7A", fontFamily: "var(--font-caveat)", fontSize: "1.05em" }}
            >
              paling nendang.
            </span>
          </h1>
          <p
            className="mt-2 text-[14px] leading-relaxed"
            style={{ color: "rgba(26,26,46,0.6)", fontFamily: "var(--font-poppins)" }}
          >
            {concepts.length} konsep berhasil digenerate. Klik kartu yang paling cocok untuk
            lanjut ke tahap prompt.
          </p>
        </div>

        {/* Tombol Generate Ulang — PRD §5.2 Acceptance Criteria */}
        <div className="flex-shrink-0">
          <Button
            variant="outline"
            size="md"
            onClick={handleRegenerate}
            className="whitespace-nowrap"
          >
            ↺ Generate Ulang
          </Button>
        </div>
      </div>

      {/* Grid konsep — DESIGN.md §3.3: 2–3 kolom, tilt acak ringan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {concepts.map((concept, i) => {
          const tilt = getTiltForIndex(i);
          const dominant = getDominantColor(concept.color_palette);
          const designTypeLabel = getDesignTypeLabel(brief?.design_type);

          return (
            <SwatchCard
              key={concept.id}
              title={concept.title}
              description={concept.description}
              palette={concept.color_palette}
              categoryTag={`${designTypeLabel} ✦`}
              tilt={tilt}
              accentColor={dominant}
              selected={selectedId === concept.id}
              onClick={() => handleSelectConcept(concept.id)}
              action={
                <Button variant="primary" size="sm">
                  Pilih Konsep Ini →
                </Button>
              }
            >
              {/* Style reference tag di dalam kartu */}
              <div className="mt-1">
                <span
                  className="inline-block text-[11px] px-2 py-0.5 rounded-[5px]"
                  style={{
                    backgroundColor: `${dominant}18`,
                    color: dominant,
                    fontFamily: "var(--font-poppins)",
                    fontWeight: 500,
                  }}
                >
                  {concept.style_reference}
                </span>
              </div>
            </SwatchCard>
          );
        })}
      </div>

      {/* Hint bawah */}
      <p
        className="mt-10 text-center text-[12px]"
        style={{ color: "rgba(26,26,46,0.38)", fontFamily: "var(--font-poppins)" }}
      >
        Setelah pilih konsep, kamu akan dapat prompt lengkap siap pakai untuk ChatGPT / Midjourney / DALL-E.
      </p>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Sub-komponen
// ---------------------------------------------------------------------------

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen py-10 md:py-16" style={{ backgroundColor: "#FAF7FF" }}>
      <div className="max-w-5xl mx-auto px-5 lg:px-8">
        {/* Back nav */}
        <a
          href="/brief"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-8 rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF]"
          style={{ color: "rgba(26,26,46,0.5)", fontFamily: "var(--font-poppins)" }}
        >
          <span aria-hidden="true">←</span> Edit brief
        </a>
        {children}
      </div>
    </div>
  );
}

function LoadingHeader() {
  return (
    <div className="mb-10">
      <span
        className="text-[11px] font-bold uppercase tracking-widest"
        style={{ color: "#3B5EFF", fontFamily: "var(--font-poppins)" }}
      >
        Step 2 dari 3
      </span>
      <h1
        className="mt-1.5 text-[26px] md:text-[32px] font-extrabold leading-tight tracking-tight"
        style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
      >
        Lagi bikin konsepnya…
      </h1>
      <p
        className="mt-2 text-[14px]"
        style={{ color: "rgba(26,26,46,0.55)", fontFamily: "var(--font-poppins)" }}
      >
        AI lagi brainstorm buat kamu — biasanya butuh 5–10 detik.
      </p>
    </div>
  );
}

function ErrorState({
  message,
  retryable,
  onRetry,
  onBack,
}: {
  message: string;
  retryable: boolean;
  onRetry?: () => void;
  onBack: () => void;
}) {
  return (
    <div
      className="rounded-[20px] border px-8 py-12 text-center max-w-md mx-auto"
      style={{
        backgroundColor: "rgba(255,92,122,0.05)",
        borderColor: "rgba(255,92,122,0.2)",
      }}
      role="alert"
    >
      <div className="text-4xl mb-4 leading-none" aria-hidden="true">😅</div>
      <h2
        className="text-[18px] font-bold mb-2"
        style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
      >
        Aduh, ada masalah nih
      </h2>
      <p
        className="text-[14px] mb-6 leading-relaxed"
        style={{ color: "rgba(26,26,46,0.65)", fontFamily: "var(--font-poppins)" }}
      >
        {message}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {retryable && onRetry && (
          <Button variant="primary" size="md" onClick={onRetry}>
            Coba Lagi
          </Button>
        )}
        <Button variant="outline" size="md" onClick={onBack}>
          Balik ke Brief
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDesignTypeLabel(type?: string | null): string {
  const map: Record<string, string> = {
    poster: "poster",
    feed: "feed",
    logo: "logo",
    banner: "banner",
  };
  return map[type ?? ""] ?? "desain";
}
