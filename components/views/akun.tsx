"use client";

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Confirm, Trio } from "@/components/chrome";
import { PasswordField } from "@/components/password-field";
import { useToast } from "@/components/toast";
import { authMessage } from "@/lib/auth-message";
import { parseBackup } from "@/lib/backup";
import { dS, fmt, fmtDate, seasonCount, seasonTotal } from "@/lib/format";
import { useData } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { Season } from "@/lib/types";

function SetCard({ title, sub, className, children }: { title: string; sub?: string; className?: string; children: ReactNode }) {
  return (
    <section className={"set" + (className ? " " + className : "")}>
      <div className="sh">
        <div>
          <h2>{title}</h2>
          {sub && <p className="sub">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

const countSacks = (list: Season[]) => list.reduce((a, s) => a + seasonCount(s), 0);

export function AkunView() {
  const { user, seasons, backupAt, signOut, deleteAccount, downloadBackup, copyBackup, restoreBackup } = useData();
  const sb = useMemo(() => createClient(), []);
  const toast = useToast();
  const [cf, setCf] = useState<"delete" | "restore" | null>(null);
  const [rv, setRv] = useState<Season[] | null>(null); // isi cadangan yang menunggu konfirmasi
  const [paste, setPaste] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const sacks = countSacks(seasons);
  const kg = seasons.reduce((a, s) => a + seasonTotal(s), 0);

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const oldPw = String(f.get("old") ?? "");
    const newPw = String(f.get("new") ?? "");
    if (!oldPw || !newPw) return setErr("Isi kata sandi lama dan yang baru.");
    if (newPw.length < 6) return setErr("Kata sandi baru minimal 6 karakter.");
    if (!user.email) return setErr("Akun ini tidak punya email.");
    setBusy(true);
    // Pastikan kata sandi lama benar sebelum menggantinya.
    const check = await sb.auth.signInWithPassword({ email: user.email, password: oldPw });
    if (check.error) {
      setBusy(false);
      return setErr(check.error.code === "invalid_credentials" ? "Kata sandi lama salah." : authMessage(check.error));
    }
    const { error } = await sb.auth.updateUser({ password: newPw });
    setBusy(false);
    if (error) return setErr(authMessage(error));
    setErr("");
    form.reset();
    toast("Kata sandi diganti");
  }

  function stage(text: string, source: "file" | "text") {
    try {
      setRv(parseBackup(text));
      setCf("restore");
    } catch (e) {
      toast(source === "file" ? "Berkas ini bukan cadangan PanenLog" : e instanceof Error ? e.message : "Cadangan tidak cocok. Tempel seluruh teksnya.", true);
    }
  }

  function onFile(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => stage(String(reader.result ?? ""), "file");
    reader.onerror = () => toast("Berkas tidak bisa dibaca", true);
    reader.readAsText(file);
  }

  async function confirmRestore() {
    if (!rv) return;
    setBusy(true);
    const ok = await restoreBackup(rv);
    setBusy(false);
    if (ok) setPaste("");
    setRv(null);
    setCf(null);
  }

  const restore =
    cf === "restore" && rv ? (
      <Confirm
        title="Ganti semua catatan dengan cadangan ini?"
        yes="Ya, ganti"
        no="Batal"
        danger
        onYes={confirmRestore}
        onNo={() => {
          setRv(null);
          setCf(null);
        }}
      >
        Isi cadangan: {rv.length} panen, {countSacks(rv)} karung. Catatan sekarang ({seasons.length} panen, {sacks} karung) akan diganti.
      </Confirm>
    ) : (
      <>
        <button type="button" className="bt" onClick={() => fileInput.current?.click()} disabled={busy}>
          Pulihkan dari berkas
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json,text/plain"
          hidden
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <details className="fg rtx">
          <summary>Pulihkan dari teks</summary>
          <textarea aria-label="Tempel cadangan di sini" placeholder="Tempel cadangan di sini" value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button type="button" className="bt" onClick={() => stage(paste, "text")} disabled={!paste.trim()}>
            Kembalikan catatan
          </button>
        </details>
      </>
    );

  return (
    <>
      <div className="band slim">
        <div className="who">
          <div className="av3" aria-hidden="true">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="wt">
            <h1 className="hi">{user.name}</h1>
            <div className="bs">{user.email}</div>
            {user.joinedAt && (
              <div className="bs">
                {user.google ? "Masuk lewat Google, bergabung " : "Bergabung "}
                {fmtDate(user.joinedAt)}
              </div>
            )}
          </div>
          <Trio items={[[seasons.length, "Panen"], [sacks, "Karung"], [fmt(kg), "Total kg"]]} />
        </div>
      </div>

      <div className="content">
        <div className={"setg reg" + (user.google ? " gg" : "")}>
          {!user.google && (
            <form className="set a-pw" onSubmit={changePassword} noValidate>
              <div className="sh">
                <div>
                  <h2>Ganti kata sandi</h2>
                  <p className="sub">Kata sandi baru minimal 6 karakter.</p>
                </div>
              </div>
              <label htmlFor="po">Kata sandi lama</label>
              <PasswordField id="po" name="old" autoComplete="current-password" />
              <label htmlFor="pn">Kata sandi baru</label>
              <PasswordField id="pn" name="new" autoComplete="new-password" />
              {err && (
                <div className="aerr" role="alert">
                  {err}
                </div>
              )}
              <div className="go">
                <button className="bt p" type="submit" disabled={busy}>
                  Simpan kata sandi
                </button>
              </div>
            </form>
          )}

          <SetCard
            title="Cadangan data"
            sub="Catatan tersimpan di akun Anda dan bisa dibuka dari perangkat mana pun. Simpan juga salinan cadangan sebagai arsip pribadi."
            className="a-bk"
          >
            <p className="bkn">
              <i className={backupAt ? "" : "off"} />
              {backupAt ? "Cadangan terakhir " + dS(backupAt) : "Belum pernah dicadangkan"}
            </p>
            <div className="go acts2">
              <button type="button" className="bt p" onClick={downloadBackup}>
                Unduh cadangan
              </button>
              <button type="button" className="bt" onClick={copyBackup}>
                Salin teks
              </button>
            </div>
            <div className="rsw">{restore}</div>
          </SetCard>

          <SetCard title="Keluar" sub="Catatan Anda tetap tersimpan di akun." className="a-out">
            <div className="go">
              <button type="button" className="bt p" onClick={() => signOut()}>
                Keluar dari akun
              </button>
            </div>
          </SetCard>

          <SetCard
            title="Hapus akun"
            sub="Seluruh catatan panen akun ini ikut terhapus dan tidak bisa dikembalikan, kecuali Anda punya cadangan."
            className="danger wide a-del"
          >
            {cf === "delete" ? (
              <Confirm title="Hapus akun ini?" yes="Ya, hapus akun" no="Batal" danger onYes={() => deleteAccount()} onNo={() => setCf(null)}>
                Tindakan ini tidak bisa dibatalkan.
              </Confirm>
            ) : (
              <div className="go">
                <button type="button" className="bt dg" onClick={() => setCf("delete")}>
                  Hapus akun dan catatan
                </button>
              </div>
            )}
          </SetCard>
        </div>
      </div>
    </>
  );
}
