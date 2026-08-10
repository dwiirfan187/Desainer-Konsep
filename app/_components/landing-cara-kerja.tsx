import React from "react";

/**
 * LandingCaraKerja — Section "Cara Kerja" (DESIGN.md §3.1)
 *
 * Tiga langkah dengan label kategori, bukan numbering 01/02/03 generic.
 * Tiap step punya warna aksen beda dari palet §1.1.
 */

const STEPS = [
  {
    label: "Brief",
    icon: "✏️",
    color: "#3B5EFF",
    bgColor: "rgba(59,94,255,0.08)",
    borderColor: "rgba(59,94,255,0.2)",
    title: "Ceritain brief kamu",
    description:
      "Mau bikin desain apa? Poster kafe, feed produk, logo startup, atau banner promo? Pilih kategori, masukkan topik singkat, dan tandai mood/vibe yang diinginkan. Tidak perlu panjang-panjang.",
  },
  {
    label: "Konsep",
    icon: "🎨",
    color: "#FF5C7A",
    bgColor: "rgba(255,92,122,0.08)",
    borderColor: "rgba(255,92,122,0.2)",
    title: "Dapat 3–5 konsep langsung",
    description:
      "AI langsung generate konsep visual — lengkap dengan palet warna, referensi gaya, dan deskripsi arah desain. Pilih konsep yang paling nendang, atau minta generate ulang.",
  },
  {
    label: "Prompt",
    icon: "⚡",
    color: "#2FBF8F",
    bgColor: "rgba(47,191,143,0.08)",
    borderColor: "rgba(47,191,143,0.2)",
    title: "Salin prompt, langsung pakai",
    description:
      "Dari konsep yang kamu pilih, dapatkan prompt siap pakai untuk ChatGPT, Midjourney, atau DALL-E. Dibuat biar hasilnya terasa buatan tangan, bukan output AI generic.",
  },
];

// Connector garis antar step — desktop only
function StepConnector({ color }: { color: string }) {
  return (
    <div className="hidden lg:flex items-center flex-1 max-w-[64px]" aria-hidden="true">
      <div
        className="w-full h-px"
        style={{ background: `linear-gradient(90deg, ${color}60, ${STEPS[1].color}60)` }}
      />
    </div>
  );
}

export function LandingCaraKerja() {
  return (
    <section
      id="cara-kerja"
      className="py-20 md:py-28"
      aria-labelledby="cara-kerja-heading"
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-8">

        {/* Header section */}
        <div className="text-center mb-14">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#FF5C7A", fontFamily: "var(--font-poppins)" }}
          >
            Cara Kerja
          </span>
          <h2
            className="mt-2 text-[32px] md:text-[38px] font-bold leading-tight"
            style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
          >
            Dari brief ke prompt,{" "}
            <span style={{ color: "#FF5C7A" }}>tiga langkah.</span>
          </h2>
          <p
            className="mt-3 text-[16px] max-w-lg mx-auto leading-relaxed"
            style={{ color: "rgba(26,26,46,0.6)", fontFamily: "var(--font-poppins)" }}
          >
            Tidak perlu tahu teknik prompting yang ribet. Cukup ceritain
            brief-nya, sisanya kita yang urus.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col lg:flex-row items-start lg:items-stretch gap-6 lg:gap-0">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.label}>
              {/* Step card */}
              <div
                className="flex-1 rounded-[20px] p-6 md:p-8 border"
                style={{
                  backgroundColor: step.bgColor,
                  borderColor: step.borderColor,
                }}
              >
                {/* Label tag — bukan numbering generic */}
                <div className="flex items-center gap-2.5 mb-5">
                  <span
                    className="text-2xl leading-none"
                    role="img"
                    aria-label={step.label}
                  >
                    {step.icon}
                  </span>
                  <span
                    className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-[6px]"
                    style={{
                      color: step.color,
                      backgroundColor: `${step.color}18`,
                      fontFamily: "var(--font-poppins)",
                    }}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Judul step */}
                <h3
                  className="text-[18px] md:text-[20px] font-semibold leading-snug mb-3"
                  style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
                >
                  {step.title}
                </h3>

                {/* Deskripsi */}
                <p
                  className="text-[14px] md:text-[15px] leading-relaxed"
                  style={{
                    color: "rgba(26,26,46,0.65)",
                    fontFamily: "var(--font-poppins)",
                  }}
                >
                  {step.description}
                </p>

                {/* Accent bar bawah */}
                <div
                  className="mt-6 h-1 w-12 rounded-full"
                  style={{ backgroundColor: step.color }}
                  aria-hidden="true"
                />
              </div>

              {/* Connector antar step */}
              {i < STEPS.length - 1 && (
                <StepConnector color={step.color} />
              )}
            </React.Fragment>
          ))}
        </div>

      </div>
    </section>
  );
}
