import type ExcelJS from "exceljs";
import { download } from "./download";
import { avg, dS, dec, fm2, fmt, fmtDate, hhmm, iso, plotSpan, plotTotal, seasonCount, seasonPeriod, seasonTotal } from "./format";
import type { Season } from "./types";

const toDash = (s: string) => s.replace(/ \u2013 /g, " s.d. ");
const slug = (s: Season) => s.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "panen";
/** Nama berkas: Laporan-Panen-2026_2026-10-03.pdf */
const fileBase = (s: Season) => `Laporan-${slug(s)}_${iso(s.startedAt)}`;

/** Di atas jumlah ini, teks WhatsApp memakai versi ringkas (tanpa daftar tiap karung). */
const COMPACT_FROM = 60;

/**
 * Teks laporan untuk pratinjau, WhatsApp, dan salin.
 * compact: hanya jumlah per lahan, supaya pesan tidak terlalu panjang untuk panen besar.
 */
export function reportText(se: Season, compact = seasonCount(se) > COMPACT_FROM): string {
  let tx =
    `Laporan panen: ${se.name}\n` +
    `Periode: ${se.closed ? toDash(seasonPeriod(se)) + " (selesai)" : "sejak " + dS(se.startedAt) + " (masih berjalan)"}\n` +
    `Dicetak: ${fmtDate(Date.now())}\n`;
  se.plots.forEach((x) => {
    const d = toDash(plotSpan(x));
    tx += `\n${x.name}${d ? ` (${d})` : ""}\n`;
    if (!compact) {
      tx += x.sacks.map((e) => `  Karung ${e.no}: ${fmt(e.weight)} kg`).join("\n");
      tx += x.sacks.length ? "\n" : "";
    }
    tx += `  Jumlah: ${x.sacks.length} karung, ${fmt(plotTotal(x))} kg\n`;
  });
  const t = seasonTotal(se);
  const c = seasonCount(se);
  return (
    tx +
    `\nTotal: ${c} karung, ${fmt(t)} kg` +
    (c ? `\nRata-rata: ${fmt(avg(t, c))} kg per karung` : "") +
    (compact ? "\n\nRincian tiap karung ada di berkas PDF atau Excel." : "")
  );
}

/** CSV dengan pemisah titik koma dan koma desimal, supaya langsung rapi di Excel Indonesia. */
export function exportCsv(se: Season): string {
  const lines = ["Lahan;No. karung;Berat (kg);Jumlah sampai sini (kg);Tanggal;Jam"];
  se.plots.forEach((x) => {
    let run = 0;
    x.sacks.forEach((e) => {
      run += e.weight;
      lines.push([x.name.replace(/;/g, ","), e.no, dec(e.weight), dec(run), iso(e.createdAt), hhmm(e.createdAt)].join(";"));
    });
  });
  // Total diletakkan sejajar kolomnya: jumlah karung di kolom Lahan, berat di kolom Berat.
  lines.push("", `Total ${seasonCount(se)} karung;;${dec(seasonTotal(se))};;;`);
  const name = fileBase(se) + ".csv";
  download(name, "\uFEFF" + lines.join("\r\n"));
  return name;
}

/* ===================== Excel berformat ===================== */

const INK = "232B16";
const solid = (rgb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb: "FF" + rgb } });
const edge = (side: "top" | "bottom", rgb: string): Partial<ExcelJS.Borders> => ({ [side]: { style: "thin", color: { argb: "FF" + rgb } } });
const KG = "#,##0.00";

export async function exportXlsx(se: Season): Promise<string> {
  const Excel = (await import("exceljs")).default;
  const wb = new Excel.Workbook();

  const put = (c: ExcelJS.Cell, value: ExcelJS.CellValue, s: Partial<ExcelJS.Style> = {}) => {
    c.value = value;
    Object.assign(c, { style: s });
  };
  const hd: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: "FF" + INK } },
    fill: solid("DDEAB0"),
    alignment: { horizontal: "center", vertical: "middle", wrapText: true },
    border: edge("bottom", "7AAD1C"),
  };
  const line = edge("bottom", "DFE6C6");
  const num: Partial<ExcelJS.Style> = { border: line, alignment: { horizontal: "right" } };

  /* ---- Ringkasan ---- */
  const w1 = wb.addWorksheet("Ringkasan");
  w1.columns = [{ width: 30 }, { width: 26 }, { width: 16 }, { width: 16 }, { width: 16 }];
  const title = { font: { bold: true, size: 16, color: { argb: "FF" + INK } }, fill: solid("C4E35A"), alignment: { vertical: "middle" as const } };
  for (let c = 1; c <= 5; c++) put(w1.getCell(1, c), c === 1 ? "Laporan Panen" : "", title);
  w1.mergeCells("A1:E1");
  w1.getRow(1).height = 25.5;
  put(w1.getCell("A2"), se.name, { font: { bold: true, size: 13, color: { argb: "FF" + INK } } });
  w1.mergeCells("A2:E2");
  w1.getRow(2).height = 18;
  const info: [string, string][] = [
    ["Periode", seasonPeriod(se)],
    ["Status", se.closed ? "Selesai" : "Masih berjalan"],
    ["Dibuat", fmtDate(Date.now())],
  ];
  info.forEach(([k, v], i) => {
    const r = 3 + i;
    put(w1.getCell(r, 1), k, { font: { color: { argb: "FF5A6648" } } });
    put(w1.getCell(r, 2), v, { font: { bold: true, color: { argb: "FF" + INK } }, alignment: { horizontal: "left" } });
    w1.mergeCells(r, 2, r, 5);
  });
  ["Lahan", "Tanggal timbang", "Jumlah karung", "Total (kg)", "Rata-rata (kg)"].forEach((h, i) => put(w1.getCell(7, i + 1), h, hd));
  w1.getRow(7).height = 22.5;

  const first = 8;
  se.plots.forEach((x, i) => {
    const r = first + i;
    const k = x.sacks.length;
    put(w1.getCell(r, 1), x.name, { border: line, alignment: { wrapText: true, vertical: "top" } });
    put(w1.getCell(r, 2), plotSpan(x) || "-", { border: line });
    put(w1.getCell(r, 3), k, { ...num, numFmt: "0" });
    put(w1.getCell(r, 4), plotTotal(x) / 100, { ...num, numFmt: KG });
    put(w1.getCell(r, 5), { formula: `IF(C${r}=0,0,D${r}/C${r})`, result: k ? avg(plotTotal(x), k) / 100 : 0 }, { ...num, numFmt: KG });
  });
  const n0 = se.plots.length;
  const last = first + n0 - 1;
  const tr = first + n0;
  const cnt = seasonCount(se);
  const tot = seasonTotal(se) / 100;
  const totStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, color: { argb: "FF" + INK } },
    fill: solid("EEF4D6"),
    border: edge("top", "7AAD1C"),
  };
  const totNum = { ...totStyle, alignment: { horizontal: "right" as const } };
  put(w1.getCell(tr, 1), "Total", totStyle);
  put(w1.getCell(tr, 2), "", totStyle);
  put(w1.getCell(tr, 3), n0 ? { formula: `SUM(C${first}:C${last})`, result: cnt } : cnt, { ...totNum, numFmt: "0" });
  put(w1.getCell(tr, 4), n0 ? { formula: `SUM(D${first}:D${last})`, result: tot } : tot, { ...totNum, numFmt: KG });
  put(w1.getCell(tr, 5), { formula: `IF(C${tr}=0,0,D${tr}/C${tr})`, result: cnt ? tot / cnt : 0 }, { ...totNum, numFmt: KG });

  /* ---- Rincian ---- */
  const w2 = wb.addWorksheet("Rincian");
  w2.columns = [{ width: 34 }, { width: 12 }, { width: 14 }, { width: 24 }, { width: 16 }, { width: 10 }];
  ["Lahan", "No. karung", "Berat (kg)", "Jumlah sampai sini (kg)", "Tanggal", "Jam"].forEach((h, i) => put(w2.getCell(1, i + 1), h, hd));
  w2.getRow(1).height = 24;
  se.plots.forEach((x) => {
    const g = w2.rowCount + 1;
    let cum = 0;
    x.sacks.forEach((e) => {
      cum += e.weight;
      const r = w2.rowCount + 1;
      const d = new Date(e.createdAt);
      put(w2.getCell(r, 1), x.name, { border: line });
      put(w2.getCell(r, 2), e.no, { ...num, numFmt: "0" });
      put(w2.getCell(r, 3), e.weight / 100, { ...num, numFmt: KG });
      put(w2.getCell(r, 4), { formula: `SUM(C${g}:C${r})`, result: cum / 100 }, { ...num, numFmt: KG });
      // Tanggal lokal ditulis sebagai tanggal kalender (tanpa geser zona waktu), jam sebagai pecahan hari.
      put(w2.getCell(r, 5), new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())), { ...num, numFmt: "dd mmm yyyy" });
      put(w2.getCell(r, 6), (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) / 86400, { ...num, numFmt: "hh:mm" });
    });
  });
  if (w2.rowCount > 1) w2.autoFilter = `A1:F${w2.rowCount}`;
  // Judul kolom tetap terlihat saat daftar digulir.
  w2.views = [{ state: "frozen", ySplit: 1 }];

  const name = fileBase(se) + ".xlsx";
  download(name, await wb.xlsx.writeBuffer());
  return name;
}

/* ===================== PDF berbranding ===================== */

async function loadLogo(): Promise<string | null> {
  try {
    const img = new Image();
    img.src = "/logo-icon.webp";
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 160;
    c.getContext("2d")!.drawImage(img, 0, 0, 160, 160);
    return c.toDataURL("image/png");
  } catch {
    return null;
  }
}

type RGB = [number, number, number];

export async function exportPdf(se: Season): Promise<string> {
  const { jsPDF } = await import("jspdf");
  const LOGO = await loadLogo();

  const d = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 16, CW = W - 2 * M, F = H - 22;
  const K: Record<string, RGB> = {
    hero: [196, 227, 90], ink: [35, 43, 22], mut: [90, 102, 72], tint: [238, 244, 214],
    t2: [221, 234, 176], ln: [223, 230, 198], zb: [246, 249, 236],
  };
  const fc = (a: RGB) => d.setFillColor(a[0], a[1], a[2]);
  const tc = (a: RGB) => d.setTextColor(a[0], a[1], a[2]);
  const dc = (a: RGB) => d.setDrawColor(a[0], a[1], a[2]);
  const dd = (z: string) => z.replace(/ \u2013 /g, " - ");
  const cl = (z: string, w: number) => d.splitTextToSize(String(z), w)[0] as string;
  const t = seasonTotal(se);
  const c = seasonCount(se);
  let y = 0;

  const logo = (x: number, yy: number, z: number) => {
    if (LOGO) {
      try {
        d.addImage(LOGO, "PNG", x, yy, z, z);
      } catch {
        /* logo opsional */
      }
    }
  };
  const mini = () => {
    fc(K.hero);
    d.rect(0, 0, W, 16, "F");
    logo(M, 3, 10);
    d.setFont("helvetica", "bold");
    d.setFontSize(10);
    tc(K.ink);
    d.text("PanenLog", M + 13, 9.6);
    d.setFont("helvetica", "normal");
    d.setFontSize(9);
    d.text(cl(se.name, 90), W - M, 9.6, { align: "right" });
    y = 26;
  };

  // Kepala halaman pertama
  fc(K.hero);
  d.rect(0, 0, W, 46, "F");
  logo(M, 10, 15);
  d.setFont("helvetica", "bold");
  d.setFontSize(15);
  tc(K.ink);
  d.text("PanenLog", M + 19, 20.5);
  d.setFontSize(9);
  d.setFont("helvetica", "normal");
  d.text("Laporan panen", W - M, 20.5, { align: "right" });
  d.setFont("helvetica", "bold");
  d.setFontSize(se.name.length > 28 ? 16 : 22);
  d.text(cl(se.name, CW), M, 35);
  d.setFont("helvetica", "normal");
  d.setFontSize(10);
  d.text(dd(seasonPeriod(se)) + (se.closed ? "  (selesai)" : "  (masih berjalan)"), M, 42);

  // Empat kotak ringkasan
  const bx: [string, string][] = [
    [fm2(t), "Total berat (kg)"],
    [String(c), "Jumlah karung"],
    [c ? fm2(avg(t, c)) : "-", "Rata-rata per karung (kg)"],
    [String(se.plots.length), "Jumlah lahan"],
  ];
  const bw = (CW - 12) / 4;
  bx.forEach((b, i) => {
    const x = M + i * (bw + 4);
    fc(K.tint);
    d.roundedRect(x, 54, bw, 22, 3, 3, "F");
    d.setFont("helvetica", "bold");
    d.setFontSize(b[0].length > 9 ? 13 : 16);
    tc(K.ink);
    d.text(b[0], x + bw / 2, 65, { align: "center" });
    d.setFont("helvetica", "normal");
    d.setFontSize(7.5);
    tc(K.mut);
    d.text(b[1], x + bw / 2, 71.5, { align: "center" });
  });
  y = 88;

  const lbl = (name: string) => {
    d.setFont("helvetica", "bold");
    d.setFontSize(10);
    tc(K.ink);
    d.text(cl(name, 110) + " (lanjutan)", M, y + 3);
    y += 7;
  };
  const th = () => {
    fc(K.t2);
    d.roundedRect(M, y, CW, 7, 2, 2, "F");
    d.setFont("helvetica", "bold");
    d.setFontSize(8.5);
    tc(K.ink);
    d.text("No.", M + 4, y + 4.8);
    d.text("Berat (kg)", M + 54, y + 4.8, { align: "right" });
    d.text("Jumlah sampai sini (kg)", M + 104, y + 4.8, { align: "right" });
    d.text("Waktu timbang", M + 114, y + 4.8);
    y += 9;
  };

  se.plots.forEach((x) => {
    if (y > F - 34) {
      d.addPage();
      mini();
    }
    const range = dd(plotSpan(x));
    d.setFont("helvetica", "bold");
    d.setFontSize(11.5);
    tc(K.ink);
    d.text(cl(x.name, 92), M, y + 4);
    d.setFont("helvetica", "normal");
    d.setFontSize(9);
    tc(K.mut);
    d.text((range ? range + ", " : "") + x.sacks.length + " karung, " + fm2(plotTotal(x)) + " kg", W - M, y + 4, { align: "right" });
    y += 8;
    if (!x.sacks.length) {
      d.setFontSize(9);
      d.text("Belum ada karung", M + 4, y + 4);
      y += 14;
      return;
    }
    th();
    let cum = 0;
    x.sacks.forEach((e, i) => {
      cum += e.weight;
      if (y > F - 8) {
        d.addPage();
        mini();
        lbl(x.name);
        th();
      }
      if (i % 2 === 0) {
        fc(K.zb);
        d.rect(M, y - 1.2, CW, 6.4, "F");
      }
      d.setFontSize(9);
      d.setFont("helvetica", "normal");
      tc(K.ink);
      d.text(String(e.no), M + 4, y + 3.2);
      d.setFont("helvetica", "bold");
      d.text(fm2(e.weight), M + 54, y + 3.2, { align: "right" });
      d.setFont("helvetica", "normal");
      tc(K.mut);
      d.text(fm2(cum), M + 104, y + 3.2, { align: "right" });
      d.text(dS(e.createdAt) + ", " + hhmm(e.createdAt), M + 114, y + 3.2);
      y += 6.4;
    });
    y += 8;
  });

  if (y > F - 16) {
    d.addPage();
    mini();
  }
  fc(K.hero);
  d.roundedRect(M, y, CW, 13, 3, 3, "F");
  d.setFont("helvetica", "bold");
  d.setFontSize(11);
  tc(K.ink);
  d.text("Total", M + 5, y + 8.3);
  d.text(c + " karung", M + 104, y + 8.3, { align: "right" });
  d.text(fm2(t) + " kg", W - M - 5, y + 8.3, { align: "right" });

  const pages = d.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    d.setPage(i);
    dc(K.ln);
    d.setLineWidth(0.3);
    d.line(M, H - 14, W - M, H - 14);
    d.setFont("helvetica", "normal");
    d.setFontSize(8);
    tc(K.mut);
    d.text("PanenLog, dicetak " + fmtDate(Date.now()), M, H - 9);
    d.text(`Halaman ${i} dari ${pages}`, W - M, H - 9, { align: "right" });
  }

  const name = fileBase(se) + ".pdf";
  download(name, d.output("arraybuffer"));
  return name;
}