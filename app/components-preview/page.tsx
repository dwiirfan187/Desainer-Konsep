/**
 * /components-preview
 *
 * Halaman ini hanya tersedia di environment development.
 * Di production, redirect ke home.
 */
import { redirect } from "next/navigation";

export default function ComponentsPreviewPage() {
  // Blokir akses di production
  if (process.env.NODE_ENV === "production") {
    redirect("/");
  }

  // Dynamic import supaya tidak masuk ke production bundle
  const PreviewClient = require("./preview-client").default;
  return <PreviewClient />;
}
