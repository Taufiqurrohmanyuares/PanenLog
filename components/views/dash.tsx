"use client";

import { Fragment, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Confirm, Empty, SackArt } from "@/components/chrome";
import { Icon } from "@/components/icon";
import { useToast } from "@/components/toast";
import {
  avg, checkWeight, defaultSeasonName, dkey, dS, dW, fmt, hhmm, nextNo, parseWeight,
  plotTotal, seasonCount, seasonEnd, seasonPeriod, seasonTotal,
} from "@/lib/format";
import { useData } from "@/lib/store";
import type { Plot, Season } from "@/lib/types";

/** Tahun pada nama panen diberi warna daun, mis. "Panen 2026". */
function SeasonTitle({ name }: { name: string }) {
  const m = /^(.*?)\b((?:19|20)\d{2})\b(.*)$/.exec(name);
  if (!m) return <>{name}</>;
  return (
    <>
      {m[1]}
      <em>{m[2]}</em>
      {m[3]}
    </>
  );
}

export function DashView() {
  const { season, plot } = useData();
  if (!season) return <StartView />;
  // key: pindah panen atau lahan mengosongkan isian, konfirmasi, dan mode ubah.
  return <Dash key={`${season.id}:${plot?.id ?? "-"}`} season={season} plot={plot} />;
}

/* ---------- Layar pertama: belum ada panen ---------- */
function StartView() {
  const { seasons, createSeason } = useData();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    createSeason({
      name: String(f.get("season") ?? "").trim() || defaultSeasonName(new Date().getFullYear(), seasons),
      firstPlotName: String(f.get("plot") ?? "").trim() || "Lahan 1",
    });
  }

  return (
    <>
      <div className="band">
        <h1 className="hi">Mulai catat panen</h1>
        <p className="bs">Isi nama panen, lalu ketik berat tiap karung satu per satu.</p>
        <SackArt />
      </div>
      <div className="content">
        <form className="card1" onSubmit={onSubmit}>
          <h2>Mulai panen pertama</h2>
          <label htmlFor="sn">Nama panen</label>
          <input className="tx" id="sn" name="season" defaultValue={defaultSeasonName(new Date().getFullYear(), seasons)} />
          <label htmlFor="ln">Nama lahan atau keterangan (boleh dikosongkan)</label>
          <input className="tx" id="ln" name="plot" placeholder="Contoh: Sawah Utara" />
          <button className="bt p" type="submit">
            Mulai Catat Panen
          </button>
        </form>
      </div>
    </>
  );
}

function PlotForm({ onSubmit }: { onSubmit: (name: string) => void }) {
  const toast = useToast();
  return (
    <form
      className="card1"
      onSubmit={(e) => {
        e.preventDefault();
        const name = String(new FormData(e.currentTarget).get("plot") ?? "").trim();
        if (!name) return toast("Isi nama lahan dulu", true);
        onSubmit(name);
      }}
    >
      <label htmlFor="pl">Nama lahan atau hari</label>
      <input className="tx" id="pl" name="plot" placeholder="Contoh: Sawah Utara" />
      <button className="bt p" type="submit">
        Tambah lahan
      </button>
    </form>
  );
}

/* ---------- Angka besar dengan animasi hitung ---------- */
function BigNumber({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 700);
      setShown(Math.round(from + (value - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const len = fmt(value).length;
  const cls = len > 9 ? " s3" : len > 8 ? " s2" : len > 7 ? " s1" : "";
  return (
    <>
      <div className="bl">Total timbangan</div>
      <div className={"big" + cls}>
        <b>{fmt(shown)}</b>
        <sup>kg</sup>
      </div>
    </>
  );
}

/* ---------- Deretan lahan yang bisa digeser (hanya bila ada 2 lahan atau lebih) ---------- */
function PlotTiles({ season, plot, addOpen, onAdd }: { season: Season; plot: Plot; addOpen: boolean; onAdd: () => void }) {
  const { selectPlot } = useData();
  const rail = useRef<HTMLDivElement>(null);

  // Geser agar lahan terpilih terlihat, hanya saat pilihan berubah (bukan saat mengetik).
  useEffect(() => {
    const t = rail.current;
    const on = t?.querySelector<HTMLElement>(".tile.on");
    if (!t || !on || t.scrollWidth <= t.clientWidth + 8) return;
    const g = parseInt(getComputedStyle(t).paddingLeft) || 0;
    t.scrollLeft = on.offsetLeft + on.offsetWidth <= t.clientWidth - g ? 0 : on.offsetLeft - g;
  }, [plot.id, season.plots.length]);

  return (
    <div className="tiles" role="tablist" aria-label="Pilih lahan" ref={rail}>
      {season.plots.map((x) => {
        const on = x.id === plot.id;
        return (
          <button key={x.id} type="button" className={"tile" + (on ? " on" : "")} role="tab" aria-selected={on} onClick={() => selectPlot(x.id)}>
            {on && <i className="rib" />}
            <b>{x.name}</b>
            <span className="tl">{fmt(plotTotal(x))} kg</span>
            <small>
              {x.sacks.length} karung{x.done ? ", selesai" : ""}
            </small>
          </button>
        );
      })}
      {!season.closed && (
        <button type="button" className="tile add" aria-expanded={addOpen} onClick={onAdd}>
          <b>+ Tambah lahan</b>
        </button>
      )}
    </div>
  );
}

/* ---------- Beranda ---------- */
function Dash({ season, plot }: { season: Season; plot: Plot | undefined }) {
  const {
    seasons, intent, setIntent, setStartNew, createPlot, addSack, updateSack, deleteSack,
    finishPlot, reopenPlot, closeSeason, reopenSeason, downloadBackup,
  } = useData();
  const router = useRouter();
  const toast = useToast();

  const [cf, setCf] = useState<string | null>(() => (intent === "close" && !season.closed ? "close" : null)); // "close" | "fin" | "del:<id>"
  const [ed, setEd] = useState<string | null>(null); // id karung yang sedang diubah
  const [edVal, setEdVal] = useState("");
  const [pend, setPend] = useState<number | null>(null); // berat janggal yang menunggu dipastikan
  const [addOpen, setAddOpen] = useState(false);
  const [last, setLast] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [w, setW] = useState("");
  const [tried, setTried] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const wantFocus = useRef(false);

  useEffect(() => {
    if (intent) setIntent(null);
  }, [intent, setIntent]);

  useEffect(() => {
    if (wantFocus.current && input.current) {
      input.current.focus();
      wantFocus.current = false;
    }
  });

  const closed = season.closed;
  const total = seasonTotal(season);
  const count = seasonCount(season);
  const period = seasonPeriod(season);

  const hero = (
    <div className={"band" + (fmt(total).length > 8 ? " long" : "")}>
      <h1 className="hi">
        <SeasonTitle name={season.name} />
      </h1>
      <div className="hst">
        <i className={closed ? "off" : ""} />
        <span>{closed ? "Selesai " + period : "Berjalan sejak " + dS(season.startedAt)}</span>
      </div>
      <BigNumber value={total} />
      <div className="hsub">
        <b>{count}</b> karung, rata-rata <b>{fmt(avg(total, count))}</b> kg
      </div>
      <SackArt />
    </div>
  );

  if (!plot) {
    return (
      <>
        {hero}
        <div className="content">
          <PlotForm onSubmit={(name) => createPlot(season.id, name)} />
        </div>
      </>
    );
  }

  const n = plot.sacks.length;
  const plotSum = plotTotal(plot);
  const a = avg(plotSum, n);
  const lock = plot.done || closed;
  const multi = season.plots.length > 1;
  const odd = (weight: number) => n >= 3 && Math.abs(weight - a) > a * 0.4;
  let run = 0;
  const cum: Record<string, number> = {};
  plot.sacks.forEach((e) => (cum[e.id] = run += e.weight));

  function save(h: number) {
    const s = addSack(plot!.id, h);
    if (s) {
      setFlash(s.id);
      setLast(`Berat karung ke-${s.no} berhasil disimpan: ${fmt(h)} kg.`);
    }
    setPend(null);
    setW("");
    setTried(false);
    wantFocus.current = true;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const h = parseWeight(w);
    if (checkWeight(h)) return setTried(true);
    if (n >= 3 && (h! < a * 0.5 || h! > a * 1.5)) return setPend(h);
    save(h!);
  }

  const parsed = parseWeight(w);
  const hintErr = w.trim() || tried ? checkWeight(parsed) : "";
  const hint = !w.trim() && !tried ? "Contoh: 52,5 (boleh pakai koma atau titik)" : hintErr || `Akan disimpan: ${fmt(parsed!)} kg`;

  function confirmYes() {
    if (cf === "fin") {
      finishPlot(plot!.id);
      setLast("");
    } else if (cf === "close") {
      closeSeason(season.id);
    }
    setCf(null);
    toast("Tersimpan");
  }

  function saveEdit(id: string) {
    const h = parseWeight(edVal);
    const er = checkWeight(h);
    if (er) return toast(er, true);
    const sack = plot!.sacks.find((e) => e.id === id);
    if (sack) updateSack(sack, h!);
    setEd(null);
    setLast(`Berat diperbarui: ${fmt(h!)} kg`);
  }

  function newSeason() {
    if (seasons.some((s) => !s.closed)) toast("Selesaikan panen yang berjalan dulu", true);
    else setStartNew(true);
    router.push("/panen");
  }

  /* kartu catat */
  let body;
  if (lock) {
    body = closed ? (
      <>
        <p className="lock">
          Panen ini selesai pada <b>{dS(seasonEnd(season))}</b>. Catatan tetap tersimpan dan hanya bisa dilihat.
        </p>
        <div className="stk">
          <button type="button" className="bt p" onClick={newSeason}>
            Mulai panen baru
          </button>
          <button type="button" className="bt" onClick={downloadBackup}>
            Unduh cadangan
          </button>
        </div>
      </>
    ) : (
      <>
        <p className="lock">Lahan ini sudah selesai ditimbang. Catatan hanya bisa dilihat.</p>
        <button type="button" className="bt p" onClick={() => reopenPlot(plot.id)}>
          Buka lagi untuk tambah karung
        </button>
      </>
    );
  } else if (pend !== null) {
    body = (
      <div className="warn" style={{ margin: "14px 0 0" }}>
        <b>Mohon periksa dulu</b>
        <br />
        Anda mengetik {fmt(pend)} kg, jauh berbeda dari rata-rata ({fmt(a)} kg). Apakah sudah benar?
        <div className="acts">
          <button type="button" className="bt p sm" onClick={() => save(pend)}>
            Ya, simpan {fmt(pend)} kg
          </button>
          <button
            type="button"
            className="bt sm"
            onClick={() => {
              setPend(null);
              setW("");
              wantFocus.current = true;
            }}
          >
            Tidak, ketik ulang
          </button>
        </div>
      </div>
    );
  } else {
    body = (
      <>
        {last && (
          <div className="okb" role="status">
            <i>
              <Icon name="check" size={18} stroke={3} />
            </i>
            {last}
          </div>
        )}
        <form autoComplete="off" onSubmit={onSubmit} noValidate>
          <div className="wf">
            <label className="wl" htmlFor="w">
              Berat karung
            </label>
            <div className="iw">
              <input
                ref={input}
                className="inp"
                id="w"
                inputMode="decimal"
                placeholder="0,0"
                enterKeyHint="done"
                aria-describedby="wh"
                aria-invalid={!!hintErr}
                value={w}
                onChange={(e) => {
                  setW(e.target.value);
                  setTried(false);
                }}
              />
            </div>
            <div id="wh" className={"rb" + (hintErr ? " bad" : "")} aria-live="polite">
              {hint}
            </div>
          </div>
          <button className="cta" type="submit">
            <span>Simpan Berat</span>
            <i>
              <Icon name="check" size={24} stroke={3} />
            </i>
          </button>
        </form>
      </>
    );
  }

  const rec = (
    <section className="rec">
      <h2>{lock ? "Catatan lahan" : `Catat karung no. ${nextNo(plot)}`}</h2>
      {body}
    </section>
  );

  /* tombol "selesai" di bawah kartu catat */
  const finish =
    !lock && n ? (
      <button type="button" className="bt gh" onClick={() => setCf("fin")}>
        {multi ? "Selesai catat lahan ini" : "Selesai Catat Panen"}
      </button>
    ) : !closed ? (
      <button type="button" className="bt gh" onClick={() => setCf("close")}>
        Selesai Catat Panen
      </button>
    ) : (
      <button
        type="button"
        className="bt gh"
        onClick={() => {
          reopenSeason(season.id);
          toast("Panen dibuka lagi");
        }}
      >
        Buka lagi panen ini
      </button>
    );

  const warn =
    cf === "close" ? (
      <Confirm title="Panen ini sudah selesai semua?" yes="Ya, selesai" no="Belum" onYes={confirmYes} onNo={() => setCf(null)}>
        Total {fmt(total)} kg dari {count} karung. Catatan tetap tersimpan dan bisa dibuka lagi.
      </Confirm>
    ) : cf === "fin" && !lock ? (
      <Confirm title={multi ? "Selesai catat lahan ini?" : "Selesai catat panen?"} yes="Ya, selesai" no="Belum" onYes={confirmYes} onNo={() => setCf(null)}>
        {n} karung, total {fmt(plotSum)} kg. Kalau ada yang salah, panen bisa dibuka lagi untuk dikoreksi.
      </Confirm>
    ) : null;

  /* daftar karung, terbaru di atas, dikelompokkan per hari */
  const perDay = new Map<number, { c: number; w: number }>();
  plot.sacks.forEach((e) => {
    const k = dkey(e.createdAt);
    const o = perDay.get(k) ?? { c: 0, w: 0 };
    o.c++;
    o.w += e.weight;
    perDay.set(k, o);
  });
  let lastKey: number | null = null;

  const rows = n ? (
    [...plot.sacks].reverse().map((e) => {
      const k = dkey(e.createdAt);
      let head = null;
      if (k !== lastKey) {
        lastKey = k;
        const o = perDay.get(k)!;
        head = (
          <div className="dh">
            <b>{dW(e.createdAt)}</b>
            <span>
              {o.c} karung, {fmt(o.w)} kg
            </span>
          </div>
        );
      }

      let row;
      if (ed === e.id) {
        row = (
          <div className="row wr">
            <div className="nb">{e.no}</div>
            <div className="rc">
              <div className="rt">
                <small className="sub">Ketik berat yang benar:</small>
                <input
                  className="tx"
                  autoFocus
                  inputMode="decimal"
                  value={edVal}
                  aria-label={`Berat baru karung ${e.no}`}
                  onChange={(ev) => setEdVal(ev.target.value)}
                  onFocus={(ev) => ev.target.select()}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") {
                      ev.preventDefault();
                      saveEdit(e.id);
                    } else if (ev.key === "Escape") setEd(null);
                  }}
                />
              </div>
              <div className="acts">
                <button type="button" className="bt p sm" onClick={() => saveEdit(e.id)}>
                  Simpan
                </button>
                <button type="button" className="bt sm" onClick={() => setEd(null)}>
                  Batal
                </button>
              </div>
            </div>
          </div>
        );
      } else if (cf === `del:${e.id}`) {
        row = (
          <div className="row wr">
            <div className="rc">
              <div className="rt">
                <b>
                  Hapus karung {e.no} ({fmt(e.weight)} kg)?
                </b>
              </div>
              <div className="acts">
                <button
                  type="button"
                  className="bt dg sm"
                  onClick={() => {
                    deleteSack(e);
                    setCf(null);
                    setLast("Karung dihapus");
                  }}
                >
                  Ya, hapus
                </button>
                <button type="button" className="bt sm" onClick={() => setCf(null)}>
                  Tidak
                </button>
              </div>
            </div>
          </div>
        );
      } else {
        const bad = odd(e.weight);
        row = (
          <div className={"row" + (e.id === flash ? " new" : "")}>
            <div className={"nb" + (bad ? " x" : "")} aria-hidden="true">
              {e.no}
            </div>
            <div className="rc">
              <div className="rt">
                <div className="kg">
                  {fmt(e.weight)}
                  <small>kg</small>
                </div>
                <small className="sub meta">
                  <span>pukul {hhmm(e.createdAt)}</span>
                  <span>jumlah {fmt(cum[e.id])} kg</span>
                </small>
                {bad && (
                  <>
                    {" "}
                    <span className="tag b">Perlu dicek</span>
                  </>
                )}
              </div>
              {!lock && (
                <div className="ra">
                  <button
                    type="button"
                    className="bt sm"
                    aria-label={`Ubah karung ${e.no}`}
                    title="Ubah"
                    onClick={() => {
                      setEd(e.id);
                      setEdVal(fmt(e.weight).replace(/\./g, ""));
                      setCf(null);
                    }}
                  >
                    <Icon name="edit" size={18} />
                    <span>Ubah</span>
                  </button>
                  <button
                    type="button"
                    className="bt dg sm"
                    aria-label={`Hapus karung ${e.no}`}
                    title="Hapus"
                    onClick={() => {
                      setCf(`del:${e.id}`);
                      setEd(null);
                    }}
                  >
                    <Icon name="trash" size={18} />
                    <span>Hapus</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }
      return (
        <Fragment key={e.id}>
          {head}
          {row}
        </Fragment>
      );
    })
  ) : (
    <Empty icon="sack" title="Belum ada karung">
      Timbang satu karung, ketik beratnya, lalu tekan Simpan.
    </Empty>
  );

  return (
    <>
      {hero}
      <div className="content">
        {warn}
        <div className="cols">
          <div className="l">
            {multi ? (
              <PlotTiles season={season} plot={plot} addOpen={addOpen} onAdd={() => setAddOpen((v) => !v)} />
            ) : (
              <div className="chs">
                <span className="ch on">
                  <Icon name="check" size={16} stroke={3} />
                  {plot.name}
                </span>
                {!closed && (
                  <button type="button" className="ch add" aria-expanded={addOpen} onClick={() => setAddOpen((v) => !v)}>
                    + Tambah lahan
                  </button>
                )}
              </div>
            )}
            {addOpen && !closed && <PlotForm onSubmit={(name) => createPlot(season.id, name)} />}
            {rec}
            {finish}
          </div>
          <div className="r">
            <h2>
              Catatan karung
              {n ? (
                <>
                  {" "}
                  <span className="m">rata-rata {fmt(a)} kg</span>
                </>
              ) : null}
            </h2>
            {rows}
          </div>
        </div>
      </div>
    </>
  );
}
