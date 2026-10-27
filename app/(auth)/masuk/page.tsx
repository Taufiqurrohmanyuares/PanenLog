import type { Metadata } from "next";
import { AuthView } from "@/components/auth-view";

export const metadata: Metadata = { title: "Masuk" };

export default async function MasukPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <AuthView initialError={error ? "Tautan masuk tidak valid atau sudah kedaluwarsa. Coba masuk lagi." : undefined} />;
}
