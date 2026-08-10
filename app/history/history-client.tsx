"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SwatchCard } from "@/components/ui/swatch-card";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip";
import { LoadingSwatchSkeleton } from "@/components/ui/loading-swatch-skeleton";
import { getDominantColor, getTiltForIndex } from "@/lib/ai-prompt-engine";
import { onAuthStateChange, signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import type { ChipColor } from "@/components/ui/chip";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HistoryItem {
  id: string;                 // saved_history.id
  is_favorite: boolean;
  created_at: string;
  prompt_id: string;
  generated_prompts: {
    id: string;
    prompt_text: string;
    platform_target: string;
    generated_concepts: {
      id: string;
      title: string;
      description: string;
      color_palette: string[];
      style_reference: string;
      design_requests: {
        id: string;
        design_type: string;
        topic: string;
      };
    };
  };
}

type ViewState =
  | { status: "loading_auth" }
  | { status: "unauthenticated" }
  | { status: "loading_data" }
  | { status: "ready"; items: HistoryItem[] }
  | { status: "error"; message: string };

// ---------------------------------------------------------------------------
// Filter options — design type chips (DESIGN.md §3.5)
// ---------------------------------------------------------------------------

const FILTER_OPTIONS: Array<{ value: string; label: string; emoji: string; color: ChipColor }> = [
  { value: "all",    label: "Semua",   emoji: "✨", color: "primary" },
  { value: "poster", label: "Poster",  emoji: "🎪", color: "primary" },
  { value: "feed",   label: "Feed",    emoji: "📱", color: "coral" },
  { value: "logo",   label: "Logo",    emoji: "✏️", color: "violet" },
  { value: "banner", label: "Banner",  emoji: "🏷️", color: "secondary" },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HistoryClient() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ status: "loading_auth" });
  const [user, setUser] = useState<User | null>(null);
  const [filter, setFilter] = useState<string[]>(["all"]);
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // ── Auth state ──────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChange((u) => {
      setUser(u);
      if (!u) setState({ status: "unauthenticated" });
    });
    return unsub;
  }, []);

  // ── Fetch history ────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setState({ status: "loading_data" });
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { setState({ status: "unauthenticated" }); return; }

      const res = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setState({ status: "error", message: (err as { error?: string }).error ?? "Gagal ambil riwayat." });
        return;
      }
      const { history } = await res.json() as { history: HistoryItem[] };
      setState({ status: "ready", items: history });
    } catch {
      setState({ status: "error", message: "Koneksi bermasalah. Coba lagi ya." });
    }
  }, []);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user, fetchHistory]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (historyId: string) => {
    // Inline confirm — tidak pakai window.confirm (tidak accessible)
    if (confirmDeleteId !== historyId) {
      setConfirmDeleteId(historyId);
      return;
    }
    setConfirmDeleteId(null);
    setDeletingId(historyId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      await fetch(`/api/history?id=${historyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setState((prev) => {
        if (prev.status !== "ready") return prev;
        return { ...prev, items: prev.items.filter((i) => i.id !== historyId) };
      });
    } finally {
      setDeletingId(null);
    }
  }, []);

  // ── Toggle favorite ───────────────────────────────────────────────────────
  const handleToggleFavorite = useCallback(async (historyId: string, current: boolean) => {
    // Optimistic update
    setState((prev) => {
      if (prev.status !== "ready") return prev;
      return {
        ...prev,
        items: prev.items.map((i) =>
          i.id === historyId ? { ...i, is_favorite: !current } : i
        ),
      };
    });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/history", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: historyId, is_favorite: !current }),
      });

      if (!res.ok) {
        // Rollback jika gagal
        setState((prev) => {
          if (prev.status !== "ready") return prev;
          return {
            ...prev,
            items: prev.items.map((i) =>
              i.id === historyId ? { ...i, is_favorite: current } : i
            ),
          };
        });
      }
    } catch {
      // Rollback
      setState((prev) => {
        if (prev.status !== "ready") return prev;
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === historyId ? { ...i, is_favorite: current } : i
          ),
        };
      });
    }
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  // ── Filter logic ──────────────────────────────────────────────────────────
  const filteredItems = state.status === "ready"
    ? state.items.filter((item) => {
        const type = item.generated_prompts.generated_concepts.design_requests.design_type;
        const passType = filter.includes("all") || filter.includes(type);
        const passFav = !showFavOnly || item.is_favorite;
        return passType && passFav;
      })
    : [];

  const favCount = state.status === "ready"
    ? state.items.filter((i) => i.is_favorite).length
    : 0;

  // ── RENDER: loading auth ──────────────────────────────────────────────────
  if (state.status === "loading_auth") {
    return <PageShell user={null} onSignOut={handleSignOut}><LoadingGrid /></PageShell>;
  }

  // ── RENDER: unauthenticated ───────────────────────────────────────────────
  if (state.status === "unauthenticated") {
    return (
      <PageShell user={null} onSignOut={handleSignOut}>
        <UnauthState />
      </PageShell>
    );
  }

  // ── RENDER: loading data ──────────────────────────────────────────────────
  if (state.status === "loading_data") {
    return <PageShell user={user} onSignOut={handleSignOut}><LoadingGrid /></PageShell>;
  }

  // ── RENDER: error ─────────────────────────────────────────────────────────
  if (state.status === "error") {
    return (
      <PageShell user={user} onSignOut={handleSignOut}>
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
          <Button variant="primary" onClick={fetchHistory}>Coba Lagi</Button>
        </div>
      </PageShell>
    );
  }

  // ── RENDER: ready ─────────────────────────────────────────────────────────
  const totalItems = state.items.length;

  return (
    <PageShell user={user} onSignOut={handleSignOut}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <span
            className="text-[11px] font-bold uppercase tracking-widest"
            style={{ color: "#3B5EFF", fontFamily: "var(--font-poppins)" }}
          >
            Riwayat
          </span>
          <h1
            className="mt-1.5 text-[26px] md:text-[32px] font-extrabold leading-tight"
            style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
          >
            Konsep &{" "}
            <span style={{ color: "#FFB100", fontFamily: "var(--font-caveat)", fontSize: "1.05em" }}>
              prompt kamu.
            </span>
          </h1>
          <p className="mt-1.5 text-[14px]" style={{ color: "rgba(26,26,46,0.5)", fontFamily: "var(--font-poppins)" }}>
            {totalItems} tersimpan{favCount > 0 ? ` · ${favCount} favorit` : ""}
          </p>
        </div>
        <Button variant="primary" size="md" asChild>
          <a href="/brief">+ Brief Baru</a>
        </Button>
      </div>

      {/* Filters — DESIGN.md §3.5 */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Filter by design type */}
        <ChipGroup
          options={FILTER_OPTIONS}
          value={filter}
          onChange={(v) => {
            // Jika pilih "all", hapus yang lain; jika pilih selain "all", hapus "all"
            if (v.includes("all") && !filter.includes("all")) {
              setFilter(["all"]);
            } else if (v.length === 0) {
              setFilter(["all"]);
            } else {
              setFilter(v.filter((x) => x !== "all").length > 0
                ? v.filter((x) => x !== "all")
                : ["all"]);
            }
          }}
        />
        {/* Toggle favorit */}
        <button
          type="button"
          onClick={() => setShowFavOnly((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-sm font-medium border transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF]"
          style={{
            backgroundColor: showFavOnly ? "#FFB100" : "rgba(255,177,0,0.10)",
            borderColor: showFavOnly ? "#FFB100" : "rgba(255,177,0,0.35)",
            color: showFavOnly ? "#1A1A2E" : "#CC8E00",
            fontFamily: "var(--font-poppins)",
          }}
          aria-pressed={showFavOnly}
        >
          <span aria-hidden="true">⭐</span>
          Favorit
        </button>
      </div>

      {/* Empty state */}
      {totalItems === 0 && <EmptyState />}
      {totalItems > 0 && filteredItems.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[15px]" style={{ color: "rgba(26,26,46,0.45)", fontFamily: "var(--font-poppins)" }}>
            Tidak ada riwayat yang cocok dengan filter ini.
          </p>
          <button
            className="mt-3 text-[13px] font-medium underline cursor-pointer"
            style={{ color: "#3B5EFF", fontFamily: "var(--font-poppins)" }}
            onClick={() => { setFilter(["all"]); setShowFavOnly(false); }}
          >
            Reset filter
          </button>
        </div>
      )}

      {/* Grid — DESIGN.md §3.5: tilt dikurangi, scannable */}
      {filteredItems.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item, i) => {
            const concept = item.generated_prompts.generated_concepts;
            const request = concept.design_requests;
            const dominant = getDominantColor(concept.color_palette as string[]);
            // §3.5: tilt dikurangi untuk scannable — hanya 0 atau ±1
            const tilt = ([0, 1, 0, -1] as const)[i % 4];
            const isDeleting = deletingId === item.id;

            return (
              <div key={item.id} className="relative group">
                <SwatchCard
                  title={concept.title}
                  description={concept.description}
                  palette={concept.color_palette as string[]}
                  categoryTag={`${request.design_type} ✦`}
                  tilt={tilt}
                  accentColor={dominant}
                  onClick={() => router.push(`/prompt/${concept.id}?requestId=${request.id}`)}
                  action={
                    <Button variant="primary" size="sm">
                      Lihat Prompt →
                    </Button>
                  }
                >
                  {/* Platform badge */}
                  <span
                    className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[4px] mt-1"
                    style={{
                      backgroundColor: item.generated_prompts.platform_target === "midjourney"
                        ? "rgba(139,92,246,0.12)" : "rgba(59,94,255,0.10)",
                      color: item.generated_prompts.platform_target === "midjourney"
                        ? "#8B5CF6" : "#3B5EFF",
                      fontFamily: "var(--font-poppins)",
                    }}
                  >
                    {item.generated_prompts.platform_target === "midjourney" ? "Midjourney" : "ChatGPT"}
                  </span>
                </SwatchCard>

                {/* Overlay actions — favorite + delete
                    visible on hover ATAU saat keyboard focus (untuk aksesibilitas §6) */}
                <div
                  className="absolute top-12 right-3 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150"
                  aria-label="Aksi kartu"
                >
                  {/* Favorite toggle */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleToggleFavorite(item.id, item.is_favorite); }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[15px] transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#3B5EFF] shadow-sm"
                    style={{
                      backgroundColor: item.is_favorite ? "#FFB100" : "#FFFFFF",
                      border: "1px solid rgba(26,26,46,0.15)",
                    }}
                    aria-label={item.is_favorite ? "Hapus dari favorit" : "Tambah ke favorit"}
                    aria-pressed={item.is_favorite}
                  >
                    {item.is_favorite ? "⭐" : "☆"}
                  </button>

                  {/* Delete — 2 langkah: klik pertama minta konfirmasi, klik kedua eksekusi */}
                  {confirmDeleteId === item.id ? (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        disabled={isDeleting}
                        className="px-2 py-1 rounded-[6px] text-[10px] font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-[#3B5EFF] shadow-sm"
                        style={{ backgroundColor: "#FF5C7A", color: "#FFFFFF", fontFamily: "var(--font-poppins)" }}
                        aria-label="Konfirmasi hapus"
                      >
                        Hapus?
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        className="px-2 py-1 rounded-[6px] text-[10px] font-medium cursor-pointer focus-visible:outline-2 focus-visible:outline-[#3B5EFF] shadow-sm"
                        style={{ backgroundColor: "#FFFFFF", color: "rgba(26,26,46,0.6)", border: "1px solid rgba(26,26,46,0.15)", fontFamily: "var(--font-poppins)" }}
                        aria-label="Batal hapus"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                      disabled={isDeleting}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#3B5EFF] shadow-sm disabled:opacity-50"
                      style={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid rgba(255,92,122,0.3)",
                        color: "#FF5C7A",
                      }}
                      aria-label="Hapus dari riwayat"
                    >
                      {isDeleting ? "…" : "🗑"}
                    </button>
                  )}
                </div>

                {/* Favorite badge — always visible if favorited, hidden on hover */}
                {item.is_favorite && confirmDeleteId !== item.id && (
                  <div className="absolute top-12 right-3 group-hover:opacity-0 group-focus-within:opacity-0 transition-opacity duration-150 pointer-events-none">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[15px] shadow-sm"
                      style={{ backgroundColor: "#FFB100", border: "1px solid rgba(26,26,46,0.10)" }}
                      aria-hidden="true"
                    >
                      ⭐
                    </div>
                  </div>
                )}

                {/* Tanggal simpan */}
                <p
                  className="mt-2 text-[11px] text-center"
                  style={{ color: "rgba(26,26,46,0.35)", fontFamily: "var(--font-poppins)" }}
                >
                  {formatDate(item.created_at)}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

// ---------------------------------------------------------------------------
// Sub-komponen
// ---------------------------------------------------------------------------

function PageShell({
  children,
  user,
  onSignOut,
}: {
  children: React.ReactNode;
  user: User | null;
  onSignOut: () => void;
}) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#FAF7FF" }}>
      {/* Nav */}
      <header
        className="sticky top-0 z-40 px-6 py-3 flex items-center justify-between"
        style={{ backgroundColor: "rgba(250,247,255,0.90)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(26,26,46,0.08)" }}
      >
        <a href="/" className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF] rounded-[4px]">
          <div className="flex rounded-[5px] overflow-hidden h-6 w-6 border border-[rgba(26,26,46,0.12)]" aria-hidden="true">
            <div className="flex-1" style={{ backgroundColor: "#3B5EFF" }} />
            <div className="flex-1" style={{ backgroundColor: "#FFB100" }} />
            <div className="flex-1" style={{ backgroundColor: "#FF5C7A" }} />
          </div>
          <span className="text-[14px] font-bold" style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}>
            Desainer Konsep
          </span>
        </a>
        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden sm:block text-[12px]" style={{ color: "rgba(26,26,46,0.45)", fontFamily: "var(--font-poppins)" }}>
              {user.email}
            </span>
          )}
          {user ? (
            <Button variant="outline" size="sm" onClick={onSignOut}>Keluar</Button>
          ) : (
            <Button variant="primary" size="sm" asChild>
              <a href="/login">Masuk</a>
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 lg:px-8 py-10 md:py-14">
        {children}
      </main>
    </div>
  );
}

// Empty state — DESIGN.md §5: ajakan bertindak, bukan "No data" (DESIGN.md §5)
function EmptyState() {
  return (
    <div className="text-center py-20 max-w-sm mx-auto">
      <div
        className="w-20 h-20 rounded-[16px] mx-auto mb-5 overflow-hidden flex"
        style={{ border: "1px solid rgba(26,26,46,0.10)" }}
        aria-hidden="true"
      >
        {["#3B5EFF", "#FFB100", "#FF5C7A", "#2FBF8F"].map((c) => (
          <div key={c} className="flex-1" style={{ backgroundColor: c }} />
        ))}
      </div>
      <h2
        className="text-[18px] font-bold mb-2"
        style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
      >
        Belum ada konsep tersimpan.
      </h2>
      {/* DESIGN.md §5: ajakan bertindak, bukan sekadar "No data" */}
      <p
        className="text-[14px] leading-relaxed mb-6"
        style={{ color: "rgba(26,26,46,0.55)", fontFamily: "var(--font-poppins)" }}
      >
        Yuk mulai brainstorm pertama kamu — kasih brief singkat, dapatkan 3–5 konsep visual + prompt siap pakai.
      </p>
      <Button variant="primary" size="md" asChild>
        <a href="/brief">Mulai Brainstorm →</a>
      </Button>
    </div>
  );
}

function UnauthState() {
  return (
    <div className="text-center py-20 max-w-sm mx-auto">
      <div className="text-5xl mb-5" aria-hidden="true">🔒</div>
      <h2
        className="text-[20px] font-bold mb-2"
        style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
      >
        Riwayat butuh akun.
      </h2>
      <p
        className="text-[14px] leading-relaxed mb-6"
        style={{ color: "rgba(26,26,46,0.55)", fontFamily: "var(--font-poppins)" }}
      >
        Daftar atau login untuk menyimpan konsep dan prompt kamu — gratis selamanya.
      </p>
      <div className="flex flex-col gap-3 max-w-[240px] mx-auto">
        <Button variant="primary" size="md" asChild>
          <a href="/login">Masuk atau Daftar →</a>
        </Button>
        <Button variant="outline" size="md" asChild>
          <a href="/brief">Coba dulu tanpa akun</a>
        </Button>
      </div>
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pt-8">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <LoadingSwatchSkeleton key={i} tilt={([0, 1, 0, -1, 0, 1] as const)[i % 6]} />
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" })
      .format(new Date(iso));
  } catch {
    return "";
  }
}
