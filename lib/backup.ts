import type { Plot, Season } from "./types";

/**
 * Format cadangan sama dengan PanenLog versi HTML, jadi cadangan dari sana bisa dipulihkan di sini,
 * dan sebaliknya. Waktu disimpan sebagai milidetik.
 */
type LegacyEntry = { id: string; n: number; w: number; t: number };
type LegacySession = { id: string; name: string; t: number; done: boolean; entries: LegacyEntry[] };
type LegacySeason = { id: string; name: string; start: number; end?: number; closed: boolean; sessions: LegacySession[] };

export function toBackup(seasons: Season[]): string {
  const out: LegacySeason[] = seasons.map((s) => ({
    id: s.id,
    name: s.name,
    start: new Date(s.startedAt).getTime(),
    ...(s.endedAt ? { end: new Date(s.endedAt).getTime() } : {}),
    closed: s.closed,
    sessions: s.plots.map((p) => ({
      id: p.id,
      name: p.name,
      t: new Date(p.createdAt).getTime(),
      done: p.done,
      entries: p.sacks.map((e) => ({ id: e.id, n: e.no, w: e.weight, t: new Date(e.createdAt).getTime() })),
    })),
  }));
  return JSON.stringify({ seasons: out });
}

const iso = (t: unknown) => {
  const d = new Date(typeof t === "number" ? t : NaN);
  return (Number.isNaN(d.getTime()) ? new Date() : d).toISOString();
};
const label = (v: unknown, fallback: string) =>
  (typeof v === "string" && v.trim() ? v.trim() : fallback).slice(0, 80);

/** Membaca teks cadangan. Semua id dibuat baru supaya tidak bentrok dengan data yang sudah ada. */
export function parseBackup(text: string): Season[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Cadangan tidak cocok. Tempel seluruh teksnya.");
  }
  const list = (raw as { seasons?: unknown })?.seasons;
  if (!Array.isArray(list)) throw new Error("Berkas ini bukan cadangan PanenLog");

  return list.map((se: Record<string, unknown>) => {
    if (!se || typeof se !== "object") throw new Error("Berkas ini bukan cadangan PanenLog");
    const seasonId = crypto.randomUUID();
    const sessions = Array.isArray(se.sessions) ? (se.sessions as Record<string, unknown>[]) : [];
    const plots: Plot[] = sessions.map((x) => {
      const plotId = crypto.randomUUID();
      const used = new Set<number>();
      const entries = Array.isArray(x.entries) ? (x.entries as Record<string, unknown>[]) : [];
      const sacks = entries.map((e) => {
        const w = e.w;
        if (typeof w !== "number" || !Number.isInteger(w) || w <= 0 || w > 100000) {
          throw new Error("Ada berat karung yang tidak valid di cadangan ini.");
        }
        let no = typeof e.n === "number" && Number.isInteger(e.n) && e.n > 0 ? e.n : 0;
        if (!no || used.has(no)) no = Math.max(0, ...used) + 1;
        used.add(no);
        return { id: crypto.randomUUID(), plotId, no, weight: w, createdAt: iso(e.t) };
      });
      return { id: plotId, seasonId, name: label(x.name, "Lahan"), done: x.done === true, createdAt: iso(x.t), sacks };
    });
    const closed = se.closed === true;
    return {
      id: seasonId,
      name: label(se.name, "Panen"),
      startedAt: iso(se.start),
      endedAt: closed && typeof se.end === "number" ? iso(se.end) : null,
      closed,
      plots,
    };
  });
}
