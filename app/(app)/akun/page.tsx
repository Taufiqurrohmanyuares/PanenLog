import type { Metadata } from "next";
import { AkunView } from "@/components/views/akun";

export const metadata: Metadata = { title: "Saya" };

export default function AkunPage() {
  return <AkunView />;
}
