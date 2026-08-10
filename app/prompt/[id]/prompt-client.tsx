"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SwatchCard } from "@/components/ui/swatch-card";
import { Button } from "@/components/ui/button";
import { getDominantColor } from "@/lib/ai-prompt-engine";
import { onAuthStateChange } from "@/lib/auth";
import type { GeneratePromptSuccess } from "@/app/api/generate-prompt/route";
import type { AntiAiElement } from "@/lib/anti-ai-prompt-engine";
import type { User } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConceptData {
  id: string;
  title: string;
  description: string;
  color_palette: string[];
  style_reference: string;
}

interface PromptData {
  id: string;
  prompt_text: string;
  platform_target: string;
}

type Platform = "chatgpt" | "midjourney";

type ViewState =
  | { status: "generating" }
  | { status: "ready"; concept: ConceptData; prompts: Record<Platform, PromptData>; antiAiElements: AntiAiElement[] }
  | { status: "error"; message: string };

// ---------------------------------------------------------------------------
// Copy button state
// ---------------------------------------------------------------------------
type CopyState = "idle" | "copied" | "error";

// ---------------------------------------------------------------------------
// Save state
// ---------------------------------------------------------------------------
type SaveState = "idle" | "saving" | "saved" | "already_saved" | "error";

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface PromptClientProps {
  conceptId: string;
  requestId: string | null;
}

export default function PromptClient({ conceptId, requestId }: PromptClientProps) {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ status: "generating" });
  const [platform, setPlatform] = useState<Platform>("chatgpt");
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [expandedAntiAi, setExpandedAntiAi] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track auth state
  useEffect(() => {
    const unsub = onAuthStateChange((u) => setUser(u));
    return unsub;
  }, []);

  // Generate prompt on mount
  const generate = useCallback(async () => {
    setState({ status: "generating" });
    try {
      const res = await fetch("/api/generate-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept_id: conceptId }),
      });

      const data = await res.json() as GeneratePromptSuccess | { error: string };

      if (!res.ok || "error" in data) {
        setState({
          status: "error",
          message: (data as { error: string }).error ?? "Gagal generate prompt. Coba lagi ya.",
        });
        return;
      }

      const success = data as GeneratePromptSuccess;
      setState({
        status: "ready",
        concept: success.concept,
        prompts: {
          chatgpt: { id: success.chatgpt_prompt_id, prompt_text: success.chatgpt_prompt, platform_target: "chatgpt" },
          midjourney: { id: success.midjourney_prompt_id, prompt_text: success.midjourney_prompt, platform_target: "midjourney" },
        },
        antiAiElements: success.anti_ai_elements,
      });
    } catch {
      setState({
        status: "error",
        message: "Koneksi bermasalah. Cek internet kamu terus coba lagi.",
      });
    }
  }, [conceptId]);

  useEffect(() => {
    generate();
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [generate]);

  // Save to history
  const handleSave = useCallback(async () => {
    if (state.status !== "ready") return;
    if (!user) { router.push(`/login?redirect=/prompt/${conceptId}`); return; }

    const promptId = state.prompts[platform].id;
    if (promptId.startsWith("temp")) return;

    setSaveState("saving");
    try {
      const { data: sessionData } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const token = sessionData.session?.access_token;
      if (!token) { setSaveState("error"); return; }

      const res = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt_id: promptId }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveState("error"); return; }
      setSaveState(data.already_saved ? "already_saved" : "saved");
      saveTimerRef.current = setTimeout(() => setSaveState("idle"), 3000);
    } catch {
      setSaveState("error");
      saveTimerRef.current = setTimeout(() => setSaveState("idle"), 2500);
    }
  }, [state, platform, user, conceptId, router]);
  const handleCopy = useCallback(async () => {
    if (state.status !== "ready") return;
    const text = state.prompts[platform].prompt_text;
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      // Flash ke green, kembali ke idle setelah 2 detik (DESIGN.md §4)
      copyTimerRef.current = setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      copyTimerRef.current = setTimeout(() => setCopyState("idle"), 2000);
    }
  }, [state, platform]);

  // -----------------------------------------------------------------------
  // RENDER: Generating
  // -----------------------------------------------------------------------
  if (state.status === "generating") {
    return (
      <PageShell requestId={requestId} conceptId={conceptId}>
        <GeneratingState />
      </PageShell>
    );
  }

  // -----------------------------------------------------------------------
  // RENDER: Error
  // -----------------------------------------------------------------------
  if (state.status === "error") {
    return (
      <PageShell requestId={requestId} conceptId={conceptId}>
        <div
          className="rounded-[20px] border px-8 py-12 text-center max-w-md mx-auto"
          style={{ backgroundColor: "rgba(255,92,122,0.05)", borderColor: "rgba(255,92,122,0.2)" }}
          role="alert"
        >
          <div className="text-4xl mb-4" aria-hidden="true">😅</div>
          <h2 className="text-[18px] font-bold mb-2" style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}>
            Aduh, ada masalah nih
          </h2>
          <p className="text-[14px] mb-6 leading-relaxed" style={{ color: "rgba(26,26,46,0.65)", fontFamily: "var(--font-poppins)" }}>
            {state.message}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="primary" size="md" onClick={generate}>Coba Lagi</Button>
            <Button variant="outline" size="md" onClick={() => router.push(requestId ? `/concepts/${requestId}` : "/brief")}>
              Pilih Konsep Lain
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  // -----------------------------------------------------------------------
  // RENDER: Ready
  // -----------------------------------------------------------------------
  const { concept, prompts, antiAiElements } = state;
  const dominant = getDominantColor(concept.color_palette);
  const currentPrompt = prompts[platform].prompt_text;
  const currentPromptId = prompts[platform].id;

  return (
    <PageShell requestId={requestId} conceptId={conceptId}>

      {/* ================================================================
          HEADER
      ================================================================ */}
      <div className="mb-8">
        <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#3B5EFF", fontFamily: "var(--font-poppins)" }}>
          Step 3 dari 3
        </span>
        <h1
          className="mt-1.5 text-[26px] md:text-[32px] font-extrabold leading-tight tracking-tight"
          style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
        >
          Prompt disalin,{" "}
          <span style={{ color: "#2FBF8F", fontFamily: "var(--font-caveat)", fontSize: "1.05em" }}>
            langsung tempel.
          </span>
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "rgba(26,26,46,0.6)", fontFamily: "var(--font-poppins)" }}>
          Prompt ini sudah dioptimasi supaya hasilnya gak kelihatan kayak output AI generic.
          Tempel langsung ke platform pilihan kamu.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

        {/* ================================================================
            KOLOM KIRI — Prompt output utama (DESIGN.md §3.4)
        ================================================================ */}
        <div className="space-y-5">

          {/* Platform toggle — pill-button group (DESIGN.md §3.4) */}
          <PlatformToggle value={platform} onChange={setPlatform} />

          {/* Prompt card — SwatchCard besar dengan konten prompt (DESIGN.md §3.4) */}
          <div
            className="relative rounded-[20px] border overflow-hidden"
            style={{
              backgroundColor: "#FFFFFF",
              borderColor: "rgba(26,26,46,0.12)",
              boxShadow: `0 8px 32px rgba(26,26,46,0.07)`,
            }}
          >
            {/* Strip palet di atas — sama seperti SwatchCard (DESIGN.md §2) */}
            <PaletteStrip palette={concept.color_palette} />

            <div className="px-6 pt-5 pb-20">
              {/* Label platform */}
              <div className="flex items-center gap-2 mb-4">
                <span
                  className="text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-[6px]"
                  style={{
                    backgroundColor: platform === "chatgpt" ? "rgba(59,94,255,0.10)" : "rgba(139,92,246,0.10)",
                    color: platform === "chatgpt" ? "#3B5EFF" : "#8B5CF6",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  {platform === "chatgpt" ? "ChatGPT / DALL-E" : "Midjourney"}
                </span>
                <span className="text-[11px]" style={{ color: "rgba(26,26,46,0.38)", fontFamily: "var(--font-poppins)" }}>
                  {currentPromptId.startsWith("temp") ? "" : `#${currentPromptId.slice(-6)}`}
                </span>
              </div>

              {/* Area teks prompt — background sedikit berbeda, border dashed (DESIGN.md §3.4) */}
              <div
                className="relative rounded-[12px] p-5"
                style={{
                  backgroundColor: "#FAF7FF",
                  border: "1.5px dashed rgba(26,26,46,0.15)",
                }}
              >
                {/* Teks prompt — monospace untuk mudah dibaca dan di-copy (DESIGN.md §3.4) */}
                <p
                  className="text-[13px] leading-[1.75] whitespace-pre-wrap break-words select-all"
                  style={{ color: "#1A1A2E", fontFamily: "ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace" }}
                  aria-label="Teks prompt"
                >
                  {currentPrompt}
                </p>

                {/* Label "area copy" */}
                <div className="absolute top-3 right-3">
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-[4px]"
                    style={{ backgroundColor: "rgba(26,26,46,0.06)", color: "rgba(26,26,46,0.4)", fontFamily: "var(--font-poppins)" }}
                  >
                    klik untuk select semua
                  </span>
                </div>
              </div>
            </div>

            {/* Tag handwritten pojok bawah-kiri — font Caveat (DESIGN.md §2) */}
            <div className="absolute bottom-5 left-6">
              <span
                className="text-[15px] font-medium"
                style={{ color: dominant, fontFamily: "var(--font-caveat)" }}
              >
                {concept.title} ✦
              </span>
            </div>

            {/* Fold corner kanan atas */}
            <FoldCorner />
          </div>

          {/* ================================================================
              TOMBOL COPY — secondary (kuning), besar, full-width (DESIGN.md §3.4)
              Micro-feedback: checkmark + warna berubah ke green (DESIGN.md §4)
          ================================================================ */}
          <CopyButton copyState={copyState} onCopy={handleCopy} />

          {/* ================================================================
              SECTION EXPANDABLE — "Kenapa gak kelihatan AI banget?" (DESIGN.md §3.4)
          ================================================================ */}
          <AntiAiExplanation
            elements={antiAiElements}
            expanded={expandedAntiAi}
            onToggle={() => setExpandedAntiAi((v) => !v)}
          />
        </div>

        {/* ================================================================
            KOLOM KANAN — SwatchCard konsep (konteks visual)
        ================================================================ */}
        <div className="lg:sticky lg:top-24">
          <p
            className="text-[11px] font-bold uppercase tracking-widest mb-3"
            style={{ color: "rgba(26,26,46,0.4)", fontFamily: "var(--font-poppins)" }}
          >
            Konsep yang kamu pilih
          </p>
          <SwatchCard
            title={concept.title}
            description={concept.description}
            palette={concept.color_palette}
            categoryTag={`${concept.style_reference} ✦`}
            tilt={0}
            accentColor={dominant}
          >
            <span
              className="inline-block text-[11px] px-2 py-0.5 rounded-[5px] mt-1"
              style={{ backgroundColor: `${dominant}18`, color: dominant, fontFamily: "var(--font-poppins)", fontWeight: 500 }}
            >
              {concept.style_reference}
            </span>
          </SwatchCard>

          {/* Aksi lanjutan */}
          <div className="mt-5 space-y-2.5">
            {/* Simpan ke Riwayat */}
            <SaveButton saveState={saveState} onSave={handleSave} isLoggedIn={!!user} />
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => router.push(requestId ? `/concepts/${requestId}` : "/brief")}
            >
              ← Pilih konsep lain
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => router.push("/brief")}
            >
              Buat brief baru
            </Button>
          </div>
        </div>

      </div>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Sub-komponen
// ---------------------------------------------------------------------------

function PageShell({
  children,
  requestId,
  conceptId,
}: {
  children: React.ReactNode;
  requestId: string | null;
  conceptId: string;
}) {
  const backHref = requestId ? `/concepts/${requestId}` : "/brief";
  return (
    <div className="min-h-screen py-10 md:py-16" style={{ backgroundColor: "#FAF7FF" }}>
      <div className="max-w-5xl mx-auto px-5 lg:px-8">
        <a
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium mb-8 rounded-[6px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF]"
          style={{ color: "rgba(26,26,46,0.5)", fontFamily: "var(--font-poppins)" }}
        >
          <span aria-hidden="true">←</span> Pilih konsep lain
        </a>
        {children}
      </div>
    </div>
  );
}

// Platform pill-button toggle (DESIGN.md §3.4)
function PlatformToggle({ value, onChange }: { value: Platform; onChange: (p: Platform) => void }) {
  const options: Array<{ id: Platform; label: string; emoji: string }> = [
    { id: "chatgpt", label: "ChatGPT / DALL-E", emoji: "✨" },
    { id: "midjourney", label: "Midjourney", emoji: "🎨" },
  ];

  return (
    <div
      className="inline-flex rounded-[12px] p-1 gap-1"
      role="group"
      aria-label="Pilih platform target"
      style={{ backgroundColor: "rgba(26,26,46,0.06)" }}
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[9px] text-[13px] font-semibold transition-all duration-[150ms] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#3B5EFF]"
            style={{
              backgroundColor: isActive ? "#FFFFFF" : "transparent",
              color: isActive ? "#1A1A2E" : "rgba(26,26,46,0.5)",
              boxShadow: isActive ? "0 1px 4px rgba(26,26,46,0.10)" : "none",
              fontFamily: "var(--font-poppins)",
            }}
            aria-pressed={isActive}
          >
            <span aria-hidden="true">{opt.emoji}</span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// Tombol copy dengan micro-feedback (DESIGN.md §4)
function CopyButton({ copyState, onCopy }: { copyState: CopyState; onCopy: () => void }) {
  const iscopied = copyState === "copied";
  const isError = copyState === "error";

  // DESIGN.md §4: tombol copy berubah ke accent-green saat disalin
  const bgColor = iscopied ? "#2FBF8F" : isError ? "#FF5C7A" : "#FFB100";
  const textColor = iscopied ? "#FFFFFF" : isError ? "#FFFFFF" : "#1A1A2E";
  const shadowColor = iscopied
    ? "0 4px 16px rgba(47,191,143,0.35)"
    : isError
    ? "0 4px 16px rgba(255,92,122,0.3)"
    : "0 4px 16px rgba(255,177,0,0.3)";

  return (
    <button
      type="button"
      onClick={onCopy}
      className="w-full flex items-center justify-center gap-2.5 rounded-[12px] py-4 text-[15px] font-bold transition-all duration-[200ms] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF] cursor-pointer"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        boxShadow: shadowColor,
        fontFamily: "var(--font-poppins)",
      }}
      aria-label={iscopied ? "Prompt sudah disalin!" : "Salin prompt ke clipboard"}
    >
      {iscopied ? (
        <>
          <CheckIcon />
          Prompt disalin, langsung tempel ke {" "}
          <span style={{ fontFamily: "var(--font-caveat)", fontSize: "1.1em" }}>ChatGPT</span>
        </>
      ) : isError ? (
        <>
          <span aria-hidden="true">⚠</span>
          Gagal nyalin, coba lagi
        </>
      ) : (
        <>
          <CopyIcon />
          Salin Prompt
        </>
      )}
    </button>
  );
}

// Section expandable anti-AI explanation (DESIGN.md §3.4)
function AntiAiExplanation({
  elements,
  expanded,
  onToggle,
}: {
  elements: AntiAiElement[];
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="rounded-[16px] border overflow-hidden"
      style={{ borderColor: "rgba(26,26,46,0.10)", backgroundColor: "#FFFFFF" }}
    >
      {/* Header toggle */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3B5EFF] transition-colors hover:bg-[rgba(26,26,46,0.02)]"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none" aria-hidden="true">🔍</span>
          <div>
            <p
              className="text-[13px] font-semibold"
              style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
            >
              Kenapa prompt ini gak kelihatan AI banget?
            </p>
            <p
              className="text-[11px] mt-0.5"
              style={{ color: "rgba(26,26,46,0.45)", fontFamily: "var(--font-poppins)" }}
            >
              {elements.length} elemen anti-AI-look aktif di prompt ini
            </p>
          </div>
        </div>
        <span
          className="text-[18px] transition-transform duration-200 flex-shrink-0"
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            color: "rgba(26,26,46,0.4)",
          }}
          aria-hidden="true"
        >
          ↓
        </span>
      </button>

      {/* Konten expandable */}
      <div
        style={{
          maxHeight: expanded ? "800px" : "0px",
          overflow: "hidden",
          transition: "max-height 300ms cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        <div
          className="px-5 pb-5 space-y-4 pt-1"
          style={{ borderTop: "1px solid rgba(26,26,46,0.07)" }}
        >
          <p
            className="text-[12px] leading-relaxed pt-3"
            style={{ color: "rgba(26,26,46,0.55)", fontFamily: "var(--font-poppins)" }}
          >
            Prompt ini dibuat dengan beberapa teknik khusus supaya hasil generate-nya punya
            karakter visual yang lebih manusiawi — bukan output AI yang plastis dan template.
          </p>

          {elements.map((el) => (
            <div
              key={el.id}
              className="flex gap-3 rounded-[10px] p-3.5"
              style={{ backgroundColor: "rgba(59,94,255,0.04)", border: "1px solid rgba(59,94,255,0.08)" }}
            >
              <span className="text-xl leading-none flex-shrink-0 mt-0.5" aria-hidden="true">
                {el.emoji}
              </span>
              <div>
                <p
                  className="text-[12px] font-semibold mb-1"
                  style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
                >
                  {el.label}
                </p>
                <p
                  className="text-[12px] leading-relaxed"
                  style={{ color: "rgba(26,26,46,0.6)", fontFamily: "var(--font-poppins)" }}
                >
                  {el.explanation}
                </p>
              </div>
            </div>
          ))}

          <p
            className="text-[11px] italic pt-1"
            style={{ color: "rgba(26,26,46,0.38)", fontFamily: "var(--font-poppins)" }}
          >
            Teknik-teknik ini bisa kamu pelajari dan aplikasikan sendiri ke prompt berikutnya.
          </p>
        </div>
      </div>
    </div>
  );
}

// Generating state — selagi AI menyusun prompt
function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 relative w-16 h-16">
        {/* Rotating swatch mini */}
        <div
          className="w-16 h-16 rounded-[12px] overflow-hidden border border-[rgba(26,26,46,0.12)]"
          style={{ animation: "subtleSpin 3s linear infinite" }}
          aria-hidden="true"
        >
          {["#3B5EFF", "#FFB100", "#FF5C7A", "#2FBF8F"].map((c, i) => (
            <div key={i} className="absolute w-8 h-8" style={{
              backgroundColor: c,
              top: i < 2 ? 0 : "50%",
              left: i % 2 === 0 ? 0 : "50%",
            }} />
          ))}
        </div>
        <style>{`
          @keyframes subtleSpin {
            0% { transform: rotate(0deg) scale(1); }
            25% { transform: rotate(3deg) scale(1.02); }
            50% { transform: rotate(0deg) scale(1); }
            75% { transform: rotate(-3deg) scale(1.02); }
            100% { transform: rotate(0deg) scale(1); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes subtleSpin { 0%, 100% { transform: none; } }
          }
        `}</style>
      </div>

      <h2
        className="text-[20px] font-bold mb-2"
        style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
      >
        Lagi nyusun promptnya…
      </h2>
      <p
        className="text-[14px] max-w-sm leading-relaxed"
        style={{ color: "rgba(26,26,46,0.55)", fontFamily: "var(--font-poppins)" }}
      >
        AI lagi milih kata-kata yang tepat supaya hasilnya gak kelihatan kayak output generik.
        Sebentar ya.
      </p>
    </div>
  );
}

// Strip warna palet di atas kartu (sama seperti SwatchCard)
function PaletteStrip({ palette }: { palette: string[] }) {
  const FOLD = 22;
  return (
    <div
      className="flex h-10 w-full"
      role="img"
      aria-label={`Palet warna: ${palette.join(", ")}`}
      style={{ clipPath: `polygon(0 0, calc(100% - ${FOLD}px) 0, 100% ${FOLD}px, 100% 100%, 0 100%)` }}
    >
      {palette.map((hex, i) => (
        <div key={i} className="flex-1 h-full" style={{ backgroundColor: hex }} title={hex} />
      ))}
    </div>
  );
}

// Fold corner kanan atas (sama seperti SwatchCard)
function FoldCorner() {
  const FOLD = 22;
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 pointer-events-none"
        style={{ width: FOLD, height: FOLD, background: "linear-gradient(225deg, rgba(26,26,46,0.18) 0%, transparent 60%)", clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
      />
      <div
        aria-hidden="true"
        className="absolute top-0 right-0 pointer-events-none"
        style={{ width: FOLD, height: FOLD, background: "linear-gradient(225deg, #f0eef8 30%, #e2dff0 100%)", clipPath: "polygon(100% 0, 0 100%, 100% 100%)", borderLeft: "1px solid rgba(26,26,46,0.10)", borderBottom: "1px solid rgba(26,26,46,0.10)" }}
      />
    </>
  );
}

// Icons
function CopyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="5" y="5" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 11V3a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Tombol simpan ke riwayat (PRD §5.4)
function SaveButton({
  saveState,
  onSave,
  isLoggedIn,
}: {
  saveState: SaveState;
  onSave: () => void;
  isLoggedIn: boolean;
}) {
  const label =
    saveState === "saving" ? "Menyimpan…" :
    saveState === "saved" ? "✓ Tersimpan di riwayat" :
    saveState === "already_saved" ? "✓ Sudah tersimpan" :
    saveState === "error" ? "Gagal simpan, coba lagi" :
    isLoggedIn ? "Simpan ke Riwayat" : "Masuk untuk Simpan";

  const isSaved = saveState === "saved" || saveState === "already_saved";

  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saveState === "saving" || isSaved}
      className="w-full flex items-center justify-center gap-2 rounded-[10px] border py-2.5 text-[13px] font-semibold transition-all duration-[200ms] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF] disabled:opacity-70 disabled:cursor-not-allowed active:scale-[0.98]"
      style={{
        fontFamily: "var(--font-poppins)",
        backgroundColor: isSaved ? "rgba(47,191,143,0.08)" : "transparent",
        borderColor: isSaved ? "rgba(47,191,143,0.35)" : "rgba(26,26,46,0.18)",
        color: isSaved ? "#2FBF8F" : "#1A1A2E",
      }}
    >
      <span aria-hidden="true">{isSaved ? "🔖" : "💾"}</span>
      {label}
    </button>
  );
}
