import type { Plot, Season } from "./types";

/** 5250 -> "52,5" (format Indonesia, 1 sampai 2 desimal). */
export const fmt = (h: number) =>
  (h / 100).toLocaleString("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
/** 5250 -> "52,50" (selalu 2 desimal; dipakai di PDF). */
export const fm2 = (h: number) =>
  (h / 100).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** 5250 -> "52,5" tanpa pemisah ribuan, untuk CSV. */
export const dec = (h: number) => String(h / 100).replace(".", ",");

/** Ketikan pengguna ("52,5" atau "52.5") -> 5250. null bila bukan angka yang valid. */
export function parseWeight(v: string): number | null {
  const s = v.trim();
  if (!/^\d+([.,]\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s.replace(",", ".")) * 100);
}

export function checkWeight(h: number | null): string {
  if (h === null) return "Ketik angka saja, contoh 52,5";
  if (h <= 0) return "Berat harus lebih dari 0";
  if (h > 100000) return "Angka terlalu besar, periksa lagi";
  return "";
}

// ----- Tanggal (zona waktu perangkat) -----
const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONF = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const DAYN = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
type T = string | number | Date;

/** 17 Agustus 2026 */
export const fmtDate = (t: T) => new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
/** 3 Okt 2026 */
export const dS = (t: T) => {
  const d = new Date(t);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
};
/** Sabtu, 3 Oktober 2026 */
export const dW = (t: T) => {
  const d = new Date(t);
  return `${DAYN[d.getDay()]}, ${d.getDate()} ${MONF[d.getMonth()]} ${d.getFullYear()}`;
};
/** Kunci angka per hari, untuk mengelompokkan dan membandingkan tanggal. */
export const dkey = (t: T) => {
  const d = new Date(t);
  return d.getFullYear() * 10000 + d.getMonth() * 100 + d.getDate();
};
const p2 = (n: number) => (n < 10 ? "0" + n : "" + n);
/** 2026-10-03 */
export const iso = (t: T) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
};
/** 14.05 */
export const hhmm = (t: T) =>
  new Date(t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }).replace(":", ".");

/** Rentang tanggal ringkas: "3 Okt 2026", "3 – 9 Okt 2026", "28 Sep – 3 Okt 2026", dst. */
export function span(a: T, b: T): string {
  if (dkey(a) === dkey(b)) return dS(a);
  const x = new Date(a);
  const y = new Date(b);
  if (x.getFullYear() !== y.getFullYear()) return `${dS(a)} \u2013 ${dS(b)}`;
  return x.getMonth() === y.getMonth() ? `${x.getDate()} \u2013 ${dS(b)}` : `${x.getDate()} ${MON[x.getMonth()]} \u2013 ${dS(b)}`;
}

// ----- Perhitungan -----
export const plotTotal = (p: Plot) => p.sacks.reduce((a, e) => a + e.weight, 0);
export const seasonTotal = (s: Season) => s.plots.reduce((a, p) => a + plotTotal(p), 0);
export const seasonCount = (s: Season) => s.plots.reduce((a, p) => a + p.sacks.length, 0);
export const avg = (total: number, count: number) => (count ? Math.round(total / count) : 0);
export const nextNo = (p: Plot) => p.sacks.reduce((m, e) => Math.max(m, e.no), 0) + 1;

/** Tanggal selesai panen: yang tersimpan, atau karung terakhir, atau tanggal mulai. */
export function seasonEnd(s: Season): number {
  if (s.endedAt) return new Date(s.endedAt).getTime();
  let m = 0;
  s.plots.forEach((p) => p.sacks.forEach((e) => (m = Math.max(m, new Date(e.createdAt).getTime()))));
  return m || new Date(s.startedAt).getTime();
}
/** "Sejak 3 Okt 2026" (berjalan) atau "3 – 9 Okt 2026" (selesai). */
export function seasonPeriod(s: Season): string {
  const start = new Date(s.startedAt).getTime();
  return s.closed ? span(start, Math.max(start, seasonEnd(s))) : "Sejak " + dS(start);
}
/** Rentang tanggal penimbangan di satu lahan ("" bila belum ada karung). */
export function plotSpan(p: Plot): string {
  if (!p.sacks.length) return "";
  const ts = p.sacks.map((e) => new Date(e.createdAt).getTime());
  return span(Math.min(...ts), Math.max(...ts));
}
/** "Panen 2026", atau "Panen 2026 ke-2" bila namanya sudah dipakai. */
export function defaultSeasonName(year: number, existing: Season[]): string {
  const base = `Panen ${year}`;
  let name = base;
  let i = 2;
  while (existing.some((s) => s.name === name)) name = `${base} ke-${i++}`;
  return name;
}
