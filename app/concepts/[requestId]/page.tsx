import type { Metadata } from "next";
import ConceptsClient from "./concepts-client";

export const metadata: Metadata = {
  title: "Pilih Konsep Desain — Desainer Konsep",
  description: "Pilih konsep visual yang paling cocok untuk dilanjutkan ke tahap prompt.",
  robots: { index: false, follow: false },
};

interface ConceptsPageProps {
  params: Promise<{ requestId: string }>;
}

export default async function ConceptsPage({ params }: ConceptsPageProps) {
  const { requestId } = await params;

  return <ConceptsClient requestId={requestId} />;
}
