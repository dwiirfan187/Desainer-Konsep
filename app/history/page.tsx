import type { Metadata } from "next";
import { Suspense } from "react";
import HistoryClient from "./history-client";

export const metadata: Metadata = {
  title: "Riwayat Konsep — Desainer Konsep",
  description: "Semua konsep dan prompt yang pernah kamu simpan.",
  robots: { index: false, follow: false },
};

export default function HistoryPage() {
  return (
    <Suspense fallback={null}>
      <HistoryClient />
    </Suspense>
  );
}
