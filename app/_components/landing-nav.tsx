/**
 * LandingNav — re-export AppNav untuk halaman landing.
 * showCaraKerja=true karena landing punya section #cara-kerja.
 */

import { AppNav } from "@/components/ui/app-nav";

export function LandingNav() {
  return <AppNav showCaraKerja={true} />;
}
