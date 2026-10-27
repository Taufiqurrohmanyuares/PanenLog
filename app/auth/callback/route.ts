import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Hanya izinkan jalur di situs ini, supaya tautan tidak bisa dipakai untuk mengalihkan ke situs lain. */
const safePath = (p: string | null) => (p && p.startsWith("/") && !p.startsWith("//") ? p : "/");

/**
 * Tujuan akhir tautan dari Google, email konfirmasi, dan email reset kata sandi.
 * Menukar `code` sekali pakai dengan sesi, lalu mengarahkan pengguna ke aplikasi.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safePath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host"); // di balik load balancer Vercel
      const base = process.env.NODE_ENV !== "development" && forwardedHost ? `https://${forwardedHost}` : origin;
      return NextResponse.redirect(`${base}${next}`);
    }
    // Hanya tampil di terminal server, tidak dikirim ke pengguna.
    console.error("[auth/callback] gagal menukar code:", error.code ?? error.name, "-", error.message);
  } else {
    // Supabase/Google mengembalikan galat lewat parameter alamat, bukan code.
    console.error(
      "[auth/callback] tanpa code:",
      searchParams.get("error_code") ?? searchParams.get("error") ?? "(tanpa kode)",
      "-",
      searchParams.get("error_description") ?? "(tanpa keterangan)",
    );
  }
  return NextResponse.redirect(`${origin}/masuk?error=auth`);
}