"use client";

import { useToast } from "@/components/toast";

/** Salin teks ke clipboard dan tampilkan pesan hasilnya. */
export function useCopy() {
  const toast = useToast();
  return (text: string, okMessage: string) => {
    try {
      navigator.clipboard.writeText(text).then(
        () => toast(okMessage),
        () => toast("Tidak bisa menyalin di sini", true),
      );
    } catch {
      toast("Tidak bisa menyalin di sini", true);
    }
  };
}
