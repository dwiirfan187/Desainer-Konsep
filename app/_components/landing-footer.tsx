import React from "react";

/**
 * LandingFooter — Footer sederhana (DESIGN.md §3.1)
 * Sederhana: logo, tagline singkat, link esensial.
 */
export function LandingFooter() {
  return (
    <footer
      className="py-10 md:py-12"
      style={{ borderTop: "1px solid rgba(26,26,46,0.08)" }}
    >
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">

          {/* Logo + tagline */}
          <div>
            <a
              href="/"
              className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF] rounded-[4px]"
            >
              <div
                className="flex rounded-[5px] overflow-hidden h-5 w-5 border border-[rgba(26,26,46,0.12)] flex-shrink-0"
                aria-hidden="true"
              >
                <div className="flex-1" style={{ backgroundColor: "#3B5EFF" }} />
                <div className="flex-1" style={{ backgroundColor: "#FFB100" }} />
                <div className="flex-1" style={{ backgroundColor: "#FF5C7A" }} />
              </div>
              <span
                className="text-[14px] font-bold"
                style={{ color: "#1A1A2E", fontFamily: "var(--font-poppins)" }}
              >
                Desainer Konsep
              </span>
            </a>
            <p
              className="mt-1.5 text-[13px]"
              style={{
                color: "rgba(26,26,46,0.45)",
                fontFamily: "var(--font-poppins)",
              }}
            >
              AI co-pilot brainstorming visual untuk desainer.
            </p>
          </div>

          {/* Links */}
          <nav
            className="flex items-center gap-5"
            aria-label="Footer navigation"
          >
            {[
              { label: "Cara Kerja", href: "#cara-kerja" },
              { label: "Coba Gratis", href: "/brief" },
              { label: "Masuk", href: "/login" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[13px] font-medium transition-colors hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5EFF] rounded-[2px]"
                style={{
                  color: "rgba(26,26,46,0.55)",
                  fontFamily: "var(--font-poppins)",
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

        </div>

        {/* Copyright */}
        <p
          className="mt-8 text-center text-[12px]"
          style={{
            color: "rgba(26,26,46,0.3)",
            fontFamily: "var(--font-poppins)",
          }}
        >
          © {new Date().getFullYear()} Desainer Konsep. Dibuat dengan ☕ dan
          terlalu banyak swatch warna.
        </p>
      </div>
    </footer>
  );
}
