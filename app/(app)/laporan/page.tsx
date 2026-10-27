import type { Metadata } from "next";
import { LaporanView } from "@/components/views/laporan";

export const metadata: Metadata = { title: "Laporan" };

export default function LaporanPage() {
  return <LaporanView />;
}
