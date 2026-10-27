import type { Metadata } from "next";
import { PanenView } from "@/components/views/panen";

export const metadata: Metadata = { title: "Panen" };

export default function PanenPage() {
  return <PanenView />;
}
