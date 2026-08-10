import type { Metadata } from "next";
import { Suspense } from "react";
import PromptClient from "./prompt-client";

export const metadata: Metadata = {
  title: "Prompt Siap Pakai — Desainer Konsep",
  description: "Prompt image generation yang sudah dioptimasi anti-AI-look. Tempel langsung ke ChatGPT atau Midjourney.",
  robots: { index: false, follow: false },
};

interface PromptPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ requestId?: string }>;
}

export default async function PromptPage({ params, searchParams }: PromptPageProps) {
  const { id } = await params;
  const { requestId } = await searchParams;

  return (
    <Suspense fallback={null}>
      <PromptClient conceptId={id} requestId={requestId ?? null} />
    </Suspense>
  );
}
