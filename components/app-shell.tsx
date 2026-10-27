"use client";

import type { ReactNode } from "react";
import { BottomNav, TopBarShell } from "@/components/chrome";

/**
 * Kerangka halaman setelah masuk: navbar atas, isi halaman, navigasi bawah (ponsel).
 * Banner (.band) dan .content digambar oleh tiap tampilan, bukan di sini.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="page">
      <TopBarShell />
      <main>{children}</main>
      <BottomNav />
    </div>
  );
}
