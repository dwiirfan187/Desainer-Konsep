import type { Metadata } from "next";
import { LandingNav } from "@/app/_components/landing-nav";
import { LandingHero } from "@/app/_components/landing-hero";
import { LandingCaraKerja } from "@/app/_components/landing-cara-kerja";
import { LandingShowcase } from "@/app/_components/landing-showcase";
import { LandingFooter } from "@/app/_components/landing-footer";

export const metadata: Metadata = {
  title: "Desainer Konsep — Dari brief ke prompt yang gak kelihatan AI banget",
  description:
    "AI co-pilot brainstorming visual untuk desainer. Dari brief singkat jadi konsep desain matang dan prompt siap pakai untuk ChatGPT, Midjourney, atau DALL-E.",
  openGraph: {
    title: "Desainer Konsep",
    description:
      "Dari brief singkat jadi konsep desain matang dan prompt siap pakai.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <>
      {/* Navigasi — sticky top, clean & lurus (§3.1) */}
      <LandingNav />

      <main>
        {/* Hero: headline + CTA + Swatch Card overlap-tilt (§3.1) */}
        <LandingHero />

        {/* Cara Kerja: Brief → Konsep → Prompt (§3.1) */}
        <LandingCaraKerja />

        {/* Showcase: contoh real Swatch Card hasil generate (§3.1) */}
        <LandingShowcase />
      </main>

      {/* Footer sederhana (§3.1) */}
      <LandingFooter />
    </>
  );
}
