"use client";

import { useState, type ReactNode } from "react";
import { Empty, Trio } from "@/components/chrome";
import { Icon } from "@/components/icon";
import { useToast } from "@/components/toast";
import { avg, dS, fmt, plotSpan, plotTotal, seasonCount, seasonPeriod, seasonTotal } from "@/lib/format";
import { exportCsv, exportPdf, exportXlsx, reportText } from "@/lib/report";
import { useData } from "@/lib/store";

function Band({ children }: { children: ReactNode }) {
  return <div className="band slim">{children}</div>;
}

export function LaporanView() {
  const { seasons, season: current, reportId, setReportId } = useData();
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  if (!seasons.length) {
    return (
      <>
        <Band>
          <h1 className="hi">Laporan</h1>
          <p className="bs">Unduh atau bagikan hasil panen</p>
        </Band>
        <div className="content">
          <Empty icon="doc" title="Belum ada data">
            Laporan muncul setelah ada karung yang dicatat.
          </Empty>
        </div>
      </>
    );
  }

  const se = seasons.find((s) => s.id === reportId) ?? current ?? seasons[seasons.length - 1];
  const t = seasonTotal(se);
  const c = seasonCount(se);
  const text = reportText(se);
  const options = [...seasons].sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  async function make(kind: "pdf" | "xlsx" | "csv") {
    setBusy(kind);
    try {
      const name = kind === "xlsx" ? await exportXlsx(se) : kind === "pdf" ? await exportPdf(se) : exportCsv(se);
      toast(`Berkas siap: ${name}`);
    } catch {
      toast("Gagal membuat berkas. Coba Salin laporan.", true);
    } finally {
      setBusy(null);
    }
  }

  function copyText() {
    try {
      navigator.clipboard.writeText(text).then(
        () => toast("Laporan disalin"),
        () => toast("Tidak bisa menyalin di sini", true),
      );
    } catch {
      toast("Tidak bisa menyalin di sini", true);
    }
  }

  const dl = (kind: "pdf" | "xlsx" | "csv", label: string) => (
    <button type="button" className="bt" onClick={() => make(kind)} disabled={busy !== null}>
      {busy === kind ? "Menyiapkan..." : label}
    </button>
  );

  return (
    <>
      <Band>
        <h1 className="hi">Laporan</h1>
        <p className="bs">Tanggal mulai dan selesai ikut tertulis di laporan.</p>
      </Band>

      <div className="content">
        <div className="selw">
          <label htmlFor="rs">Periode panen</label>
          <select className="sel" id="rs" value={se.id} onChange={(e) => setReportId(e.target.value)}>
            {options.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}, {x.closed ? seasonPeriod(x) : "sejak " + dS(x.startedAt)}
              </option>
            ))}
          </select>
        </div>

        <div className="lp-grid">
          {/* Kiri: ringkasan, rincian, pratinjau pesan */}
          <div className="sheet">
            <div className="rh">
              <div>
                <h2>{se.name}</h2>
                <p className="sub">Dicetak {dS(new Date())}</p>
              </div>
              <div className="tdate">
                <i className={se.closed ? "off" : ""} />
                {seasonPeriod(se)}
              </div>
            </div>

            <div className="tt">
              <Trio items={[[fmt(t), "Total berat"], [c, "Karung"], [fmt(avg(t, c)), "Rata-rata"]]} />
            </div>

            <h2 className="sec">Rincian per lahan</h2>
            <div>
              {se.plots.map((x) => (
                <div className="lr" key={x.id}>
                  <div className="lm">
                    <b>{x.name}</b>
                    <small>{plotSpan(x) || "Belum ada karung"}</small>
                  </div>
                  <div className="ln">
                    <b>
                      {fmt(plotTotal(x))}
                      <small> kg</small>
                    </b>
                    <small>{x.sacks.length} karung</small>
                  </div>
                </div>
              ))}
              <div className="lr tot">
                <div className="lm">
                  <b>Total</b>
                </div>
                <div className="ln">
                  <b>
                    {fmt(t)}
                    <small> kg</small>
                  </b>
                </div>
              </div>
            </div>

            <h2 className="sec">Pratinjau pesan</h2>
            <div className="pv">
              <pre tabIndex={0}>{text}</pre>
            </div>
            <p className="sub" style={{ marginTop: 8 }}>
              Teks ini yang terkirim lewat WhatsApp atau tersalin.
            </p>
          </div>

          {/* Kanan: bagikan dan unduh (di ponsel tampil lebih dulu) */}
          <aside className="lp-share" aria-label="Bagikan dan unduh">
            <h2>Bagikan laporan</h2>
            <div className="shr" style={{ marginBottom: 24 }}>
              <a className="bt p" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(text)}`}>
                <Icon name="wa" size={20} />
                <span>Kirim lewat WhatsApp</span>
              </a>
              <button type="button" className="bt" onClick={copyText}>
                <Icon name="copy" size={18} />
                <span>Salin teks laporan</span>
              </button>
            </div>

            <h2>Unduh laporan</h2>
            <div className="pay">
              {dl("pdf", "PDF")}
              {dl("xlsx", "Excel")}
              {dl("csv", "CSV")}
              <button type="button" className="bt" onClick={() => window.print()}>
                Cetak
              </button>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}