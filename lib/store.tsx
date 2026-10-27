"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/toast";
import { toBackup } from "@/lib/backup";
import { toPayload } from "@/lib/data";
import { download } from "@/lib/download";
import { iso, nextNo } from "@/lib/format";
import type { AppUser, Plot, Sack, Season } from "@/lib/types";

type NewSeason = { name: string; startedAt?: string; firstPlotName?: string };

type Ctx = {
  user: AppUser;
  seasons: Season[];
  /** Panen yang sedang dibuka di Beranda. */
  season: Season | undefined;
  /** Lahan yang sedang dibuka di Beranda. */
  plot: Plot | undefined;
  backupAt: string | null;
  reportId: string | null;
  setReportId: (id: string | null) => void;
  /** Formulir "Panen baru" di halaman Panen sedang terbuka. */
  startNew: boolean;
  setStartNew: (v: boolean) => void;
  /** Niat yang dibawa dari halaman lain, dibaca sekali oleh Beranda. */
  intent: "close" | null;
  setIntent: (v: "close" | null) => void;

  openSeason: (id: string) => void;
  selectPlot: (id: string) => void;
  createSeason: (s: NewSeason) => void;
  createPlot: (seasonId: string, name: string) => void;
  addSack: (plotId: string, weight: number) => Sack | null;
  updateSack: (sack: Sack, weight: number) => void;
  deleteSack: (sack: Sack) => void;
  /** Selesaikan lahan. Bila panen hanya punya satu lahan, panennya ikut ditutup. */
  finishPlot: (plotId: string) => void;
  reopenPlot: (plotId: string) => void;
  closeSeason: (seasonId: string) => void;
  reopenSeason: (seasonId: string) => void;

  downloadBackup: () => void;
  copyBackup: () => void;
  restoreBackup: (list: Season[]) => Promise<boolean>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const DataCtx = createContext<Ctx | null>(null);

export function useData() {
  const c = useContext(DataCtx);
  if (!c) throw new Error("useData harus dipakai di dalam DataProvider");
  return c;
}

type Result = { error: { message: string } | null };

const mapPlot = (list: Season[], plotId: string, fn: (p: Plot) => Plot) =>
  list.map((s) => (s.plots.some((p) => p.id === plotId) ? { ...s, plots: s.plots.map((p) => (p.id === plotId ? fn(p) : p)) } : s));
const mapSeason = (list: Season[], id: string, fn: (s: Season) => Season) => list.map((s) => (s.id === id ? fn(s) : s));
const byNo = (a: Sack, b: Sack) => a.no - b.no;
const byStart = (a: Season, b: Season) => a.startedAt.localeCompare(b.startedAt);

export function DataProvider({ user, initialSeasons, children }: { user: AppUser; initialSeasons: Season[]; children: ReactNode }) {
  const sb = useMemo(() => createClient(), []);
  const router = useRouter();
  const toast = useToast();

  const [seasons, setSeasons] = useState<Season[]>(initialSeasons);
  const [curSeasonId, setCurSeasonId] = useState<string | null>(null);
  const [curPlotId, setCurPlotId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [startNew, setStartNew] = useState(false);
  const [intent, setIntent] = useState<"close" | null>(null);
  const [backupAt, setBackupAt] = useState<string | null>(user.backupAt);

  const season =
    seasons.find((s) => s.id === curSeasonId) ??
    [...seasons].reverse().find((s) => !s.closed) ??
    seasons[seasons.length - 1];
  const plot = season
    ? (season.plots.find((p) => p.id === curPlotId) ??
      [...season.plots].reverse().find((p) => !p.done) ??
      season.plots[season.plots.length - 1])
    : undefined;

  /**
   * Ubah tampilan sekarang juga (supaya terasa instan di lapangan), simpan ke Supabase di latar,
   * lalu batalkan perubahan lokal bila penyimpanan gagal.
   */
  function mutate(apply: (s: Season[]) => Season[], revert: (s: Season[]) => Season[], send: () => PromiseLike<Result>, failMsg: string) {
    setSeasons(apply);
    Promise.resolve(send()).then(
      ({ error }) => {
        if (error) {
          setSeasons(revert);
          toast(failMsg, true);
        }
      },
      () => {
        setSeasons(revert);
        toast(failMsg + " Periksa sambungan internet.", true);
      },
    );
  }

  function markBackup() {
    const now = new Date().toISOString();
    setBackupAt(now);
    sb.from("profiles").update({ backup_at: now }).eq("id", user.id).then(() => {});
  }

  /** Tutup atau buka panen, sekaligus (bila perlu) status selesai lahannya. */
  function setClosed(seasonId: string, closed: boolean, alsoPlots: boolean) {
    const target = seasons.find((s) => s.id === seasonId);
    if (!target) return;
    const prev = { closed: target.closed, endedAt: target.endedAt };
    const prevDone = new Map(target.plots.map((p) => [p.id, p.done]));
    const endedAt = closed ? new Date().toISOString() : null;
    const touchPlots = alsoPlots && target.plots.length > 0;
    mutate(
      (l) =>
        mapSeason(l, seasonId, (s) => ({
          ...s,
          closed,
          endedAt,
          plots: touchPlots ? s.plots.map((p) => ({ ...p, done: closed ? true : false })) : s.plots,
        })),
      (l) =>
        mapSeason(l, seasonId, (s) => ({
          ...s,
          closed: prev.closed,
          endedAt: prev.endedAt,
          plots: touchPlots ? s.plots.map((p) => ({ ...p, done: prevDone.get(p.id) ?? p.done })) : s.plots,
        })),
      async () => {
        const a = await sb.from("seasons").update({ closed, ended_at: endedAt }).eq("id", seasonId);
        if (a.error || !touchPlots) return a;
        return sb.from("plots").update({ done: closed }).eq("season_id", seasonId);
      },
      "Status panen belum tersimpan.",
    );
  }

  const value: Ctx = {
    user,
    seasons,
    season,
    plot,
    backupAt,
    reportId,
    setReportId,
    startNew,
    setStartNew,
    intent,
    setIntent,

    openSeason(id) {
      setCurSeasonId(id);
      setCurPlotId(null);
    },
    selectPlot: setCurPlotId,

    createSeason({ name, startedAt, firstPlotName }) {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const started = startedAt ?? now;
      const first: Plot | null = firstPlotName
        ? { id: crypto.randomUUID(), seasonId: id, name: firstPlotName, done: false, createdAt: now, sacks: [] }
        : null;
      const created: Season = { id, name, startedAt: started, endedAt: null, closed: false, plots: first ? [first] : [] };
      setCurSeasonId(id);
      setCurPlotId(first?.id ?? null);
      mutate(
        (l) => [...l, created].sort(byStart),
        (l) => l.filter((s) => s.id !== id),
        async () => {
          const a = await sb.from("seasons").insert({ id, name, started_at: started });
          if (a.error || !first) return a;
          return sb.from("plots").insert({ id: first.id, season_id: id, name: first.name, created_at: now });
        },
        "Panen belum tersimpan.",
      );
    },

    createPlot(seasonId, name) {
      const p: Plot = { id: crypto.randomUUID(), seasonId, name, done: false, createdAt: new Date().toISOString(), sacks: [] };
      setCurPlotId(p.id);
      mutate(
        (l) => mapSeason(l, seasonId, (s) => ({ ...s, plots: [...s.plots, p] })),
        (l) => mapSeason(l, seasonId, (s) => ({ ...s, plots: s.plots.filter((x) => x.id !== p.id) })),
        () => sb.from("plots").insert({ id: p.id, season_id: seasonId, name, created_at: p.createdAt }),
        "Lahan belum tersimpan.",
      );
    },

    addSack(plotId, weight) {
      const target = seasons.flatMap((s) => s.plots).find((p) => p.id === plotId);
      if (!target) return null;
      const sack: Sack = { id: crypto.randomUUID(), plotId, no: nextNo(target), weight, createdAt: new Date().toISOString() };
      mutate(
        (l) => mapPlot(l, plotId, (p) => ({ ...p, sacks: [...p.sacks, sack] })),
        (l) => mapPlot(l, plotId, (p) => ({ ...p, sacks: p.sacks.filter((e) => e.id !== sack.id) })),
        () => sb.from("sacks").insert({ id: sack.id, plot_id: plotId, no: sack.no, weight_x100: weight, created_at: sack.createdAt }),
        `Karung ${sack.no} belum tersimpan.`,
      );
      return sack;
    },

    updateSack(sack, weight) {
      const put = (w: number) => (l: Season[]) =>
        mapPlot(l, sack.plotId, (p) => ({ ...p, sacks: p.sacks.map((e) => (e.id === sack.id ? { ...e, weight: w } : e)) }));
      mutate(put(weight), put(sack.weight), () => sb.from("sacks").update({ weight_x100: weight }).eq("id", sack.id), "Perubahan belum tersimpan.");
    },

    deleteSack(sack) {
      mutate(
        (l) => mapPlot(l, sack.plotId, (p) => ({ ...p, sacks: p.sacks.filter((e) => e.id !== sack.id) })),
        (l) => mapPlot(l, sack.plotId, (p) => ({ ...p, sacks: [...p.sacks, sack].sort(byNo) })),
        () => sb.from("sacks").delete().eq("id", sack.id),
        "Karung belum terhapus.",
      );
    },

    finishPlot(plotId) {
      const owner = seasons.find((s) => s.plots.some((p) => p.id === plotId));
      if (!owner) return;
      if (owner.plots.length < 2) return setClosed(owner.id, true, true);
      const put = (v: boolean) => (l: Season[]) => mapPlot(l, plotId, (p) => ({ ...p, done: v }));
      mutate(put(true), put(false), () => sb.from("plots").update({ done: true }).eq("id", plotId), "Status lahan belum tersimpan.");
    },

    reopenPlot(plotId) {
      const put = (v: boolean) => (l: Season[]) => mapPlot(l, plotId, (p) => ({ ...p, done: v }));
      mutate(put(false), put(true), () => sb.from("plots").update({ done: false }).eq("id", plotId), "Status lahan belum tersimpan.");
    },

    closeSeason: (id) => setClosed(id, true, false),
    reopenSeason(id) {
      const s = seasons.find((x) => x.id === id);
      // Panen satu lahan ikut membuka lahannya, karena menutup panen tadi menyelesaikan lahan itu juga.
      setClosed(id, false, (s?.plots.length ?? 0) < 2);
    },

    downloadBackup() {
      const name = `PanenLog-cadangan-${iso(Date.now())}.json`;
      download(name, toBackup(seasons));
      toast(`Berkas siap: ${name}`);
      markBackup();
    },
    copyBackup() {
      const text = toBackup(seasons);
      try {
        navigator.clipboard.writeText(text).then(
          () => {
            toast("Cadangan disalin. Simpan di tempat aman.");
            markBackup();
          },
          () => toast("Tidak bisa menyalin di sini", true),
        );
      } catch {
        toast("Tidak bisa menyalin di sini", true);
      }
    },

    async restoreBackup(list) {
      const { error } = await sb.rpc("replace_all_data", { payload: toPayload(list) });
      if (error) {
        toast("Pemulihan gagal. Catatan Anda tidak berubah.", true);
        return false;
      }
      setSeasons([...list].sort(byStart));
      setCurSeasonId(null);
      setCurPlotId(null);
      setReportId(null);
      toast("Catatan dikembalikan");
      return true;
    },

    async signOut() {
      await sb.auth.signOut();
      router.replace("/masuk");
      router.refresh();
      toast("Anda sudah keluar");
    },

    async deleteAccount() {
      const { error } = await sb.rpc("delete_my_account");
      if (error) {
        toast("Akun belum bisa dihapus. Coba lagi.", true);
        return;
      }
      await sb.auth.signOut();
      router.replace("/masuk");
      router.refresh();
      toast("Akun dan catatannya dihapus");
    },
  };

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}
