import type { Metadata } from "next";
import LoginClient from "./login-client";

export const metadata: Metadata = {
  title: "Masuk atau Daftar — Desainer Konsep",
  description: "Login atau buat akun untuk menyimpan riwayat konsep dan prompt kamu.",
};

export default function LoginPage() {
  return <LoginClient />;
}
