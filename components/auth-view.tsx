"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/chrome";
import { Icon } from "@/components/icon";
import { PasswordField } from "@/components/password-field";
import { useToast } from "@/components/toast";
import { authMessage } from "@/lib/auth-message";
import { createClient } from "@/lib/supabase/client";

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const field = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

type Mode = "in" | "up" | "forgot";

const HERO: Record<Mode, { title: string; text: string; photo: string; pos: string; alt: string }> = {
  in: {
    title: "Lanjutkan menimbang",
    text: "Masuk untuk membuka catatan karung Anda.",
    photo: "/auth-masuk.jpg",
    pos: "58% 38%",
    alt: "Petani menuang gabah ke karung di atas timbangan, dengan tumpukan karung di belakangnya.",
  },
  up: {
    title: "Mulai buku timbang Anda",
    text: "Cukup nama, email, dan kata sandi. Catatan tersimpan di akun Anda.",
    photo: "/auth-daftar.jpg",
    pos: "46% 28%",
    alt: "Petani menimbang karung gabah di timbangan besi di gudang penggilingan.",
  },
  forgot: {
    title: "Atur ulang kata sandi",
    text: "Kami kirim tautan ke email Anda untuk membuat kata sandi baru.",
    photo: "/auth-masuk.jpg",
    pos: "58% 38%",
    alt: "Petani menuang gabah ke karung di atas timbangan, dengan tumpukan karung di belakangnya.",
  },
};

export function AuthView({ initialError }: { initialError?: string }) {
  const sb = useMemo(() => createClient(), []);
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<Mode>("in");
  const [err, setErr] = useState(initialError ?? "");
  const [bad, setBad] = useState(false); // tepi merah hanya setelah formulir ini dikirim, bukan untuk galat dari tautan
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const up = mode === "up";
  const hero = HERO[mode];

  const go = () => {
    router.replace("/");
    router.refresh();
  };
  const fail = (m: string) => {
    setErr(m);
    setBad(true);
    setInfo("");
    setBusy(false);
  };
  const pick = (m: Mode) => {
    setMode(m);
    setErr("");
    setBad(false);
    setSent(false);
    if (m !== "in") setInfo("");
  };

  async function onLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = field(f, "email");
    const password = String(f.get("password") ?? "");
    if (!email || !password) return fail("Isi email dan kata sandi.");
    setBusy(true);
    setErr("");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return fail(authMessage(error));
    go();
  }

  async function onRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = field(f, "name");
    const email = field(f, "email");
    const p1 = String(f.get("password") ?? "");
    const p2 = String(f.get("again") ?? "");
    if (name.length < 2) return fail("Isi nama Anda, minimal 2 huruf.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Isi alamat email yang benar.");
    if (p1.length < 6) return fail("Kata sandi minimal 6 karakter.");
    if (p1 !== p2) return fail("Kedua kata sandi belum sama. Ketik ulang.");
    setBusy(true);
    setErr("");
    const { data, error } = await sb.auth.signUp({
      email,
      password: p1,
      options: { data: { full_name: name }, emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) return fail(authMessage(error));
    // Email sudah terdaftar: Supabase mengembalikan user tanpa identitas agar alamat tidak bocor.
    if (data.user && data.user.identities?.length === 0) return fail(authMessage({ code: "user_already_exists", message: "" }));
    if (data.session) {
      toast(`Akun dibuat. Selamat datang, ${name.split(" ")[0]}`);
      return go();
    }
    setBusy(false);
    setInfo(`Kami mengirim tautan konfirmasi ke ${email}. Buka email itu, lalu masuk.`);
    setMode("in");
  }

  async function onGoogle() {
    setErr("");
    const { error } = await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
    if (error) fail(authMessage(error));
  }

  async function onForgot(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = field(new FormData(e.currentTarget), "email");
    if (!email) return fail("Isi email akun Anda dulu.");
    setBusy(true);
    setErr("");
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/auth/callback?next=/akun` });
    setBusy(false);
    if (error) return fail(authMessage(error));
    setSent(true);
  }

  return (
    <div className="page au">
      <div className="band">
        <div className="bk">
          <LogoMark />
          <span className="bw">
            Panen<b>Log</b>
          </span>
        </div>
        <h1 className="hi">{hero.title}</h1>
        <p className="bs">{hero.text}</p>
        <img className="ph" src={hero.photo} alt={hero.alt} style={{ objectPosition: hero.pos }} />
      </div>

      <main className="fm">
        <div className="lk2">
          <LogoMark />
          <div>
            <span className="bw">
              Panen<b>Log</b>
            </span>
            <small>Catat Panen, Jaga Hasil</small>
          </div>
        </div>

        {mode !== "forgot" && (
          <div className="seg" role="tablist" aria-label="Masuk atau daftar">
            <button type="button" role="tab" aria-selected={!up} onClick={() => pick("in")}>
              Masuk
            </button>
            <button type="button" role="tab" aria-selected={up} onClick={() => pick("up")}>
              Daftar
            </button>
          </div>
        )}

        {info && mode === "in" && (
          <div className="okb" role="status" style={{ margin: "0 0 16px" }}>
            <i>
              <Icon name="check" size={18} stroke={3} />
            </i>
            {info}
          </div>
        )}

        {mode === "up" && (
          <form className="card1" onSubmit={onRegister} noValidate>
            <label htmlFor="rn">Nama Anda</label>
            <input className="tx" id="rn" name="name" autoComplete="name" placeholder="Contoh: Pak Slamet" />
            <label htmlFor="re">Email</label>
            <input
              className="tx"
              id="re"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              placeholder="nama@email.com"
            />
            <p className="hn">Email dipakai untuk masuk, dan untuk mengatur ulang kata sandi bila lupa.</p>
            <label htmlFor="rp">Kata sandi (minimal 6 karakter)</label>
            <PasswordField id="rp" name="password" autoComplete="new-password" />
            <label htmlFor="rq">Ulangi kata sandi</label>
            <PasswordField id="rq" name="again" autoComplete="new-password" />
            {err && (
              <div className="aerr" role="alert">
                {err}
              </div>
            )}
            <button className="bt p" type="submit" disabled={busy}>
              Buat akun
            </button>
          </form>
        )}

        {mode === "in" && (
          <form className="card1" onSubmit={onLogin} noValidate>
            <label htmlFor="le">Email</label>
            <input
              className={"tx" + (bad ? " er" : "")}
              id="le"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              placeholder="nama@email.com"
            />
            <label htmlFor="lp">Kata sandi</label>
            <PasswordField id="lp" name="password" autoComplete="current-password" invalid={bad} />
            <div className="fl">
              <button type="button" className="lk" onClick={() => pick("forgot")}>
                Lupa kata sandi?
              </button>
            </div>
            {err && (
              <div className="aerr" role="alert">
                {err}
              </div>
            )}
            <button className="bt p" type="submit" disabled={busy}>
              Masuk
            </button>
          </form>
        )}

        {mode === "forgot" && (
          <form className="card1" onSubmit={onForgot} noValidate>
            <h2>Lupa kata sandi?</h2>
            <p className="sub">Masukkan email yang Anda pakai saat mendaftar.</p>
            <label htmlFor="fe">Email</label>
            <input
              className={"tx" + (bad ? " er" : "")}
              id="fe"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              placeholder="nama@email.com"
            />
            {err && (
              <div className="aerr" role="alert">
                {err}
              </div>
            )}
            {sent && (
              <div className="okb" role="status">
                <i>
                  <Icon name="check" size={18} stroke={3} />
                </i>
                Jika email terdaftar, tautan sudah dikirim. Cek kotak masuk atau folder spam.
              </div>
            )}
            <button className="bt p" type="submit" disabled={busy}>
              {sent ? "Kirim ulang tautan" : "Kirim tautan"}
            </button>
            <div className="fl" style={{ justifyContent: "center" }}>
              <button type="button" className="lk" onClick={() => pick("in")}>
                Kembali ke Masuk
              </button>
            </div>
          </form>
        )}

        {mode !== "forgot" && (
          <>
            <div className="or">atau</div>
            <button type="button" className="gbt" onClick={onGoogle} disabled={busy}>
              <GoogleLogo />
              {up ? "Daftar dengan Google" : "Masuk dengan Google"}
            </button>
          </>
        )}

        <p className="fn">Catatan tersimpan di akun Anda dan bisa dibuka dari ponsel atau komputer mana pun.</p>
      </main>
    </div>
  );
}
