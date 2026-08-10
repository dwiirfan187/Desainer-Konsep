import type { Metadata } from "next";
import { Poppins, Caveat } from "next/font/google";
import "./globals.css";

// ---------------------------------------------------------------------------
// Font: Poppins — display, heading, body (DESIGN.md §1.2)
// ---------------------------------------------------------------------------
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// ---------------------------------------------------------------------------
// Font: Caveat — aksen handwritten untuk tag & anotasi (DESIGN.md §1.2)
// ---------------------------------------------------------------------------
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Desainer Konsep — AI Design Concept & Prompt Generator",
  description:
    "Co-pilot brainstorming visual untuk desainer — dari brief singkat menjadi konsep desain matang dan prompt AI yang hasilnya terasa seperti buatan manusia.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="id"
      className={`${poppins.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        {children}
      </body>
    </html>
  );
}
