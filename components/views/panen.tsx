"use client";

import { Fragment, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Empty, SackArt, Trio } from "@/components/chrome";
import { useToast } from "@/components/toast";
import { defaultSeasonName, dkey, dS, dW, fmt, iso, seasonCount, seasonPeriod, seasonTotal } from "@/lib/format";
import { useData } from "@/lib/store";

/** "2026-10-03" -> tanggal itu pukul 12.00 waktu setempat (null bila bukan format tanggal). */
function parseDay(v: string): Date | null {
  const q = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return q ? new Date(+q[1], +q[2] - 1, +q[3], 12, 0, 0) : null;
}

function NewSeasonForm() {
  const { seasons, createSeason, setStartNew } = useData();
  const router = useRouter();
  const today = iso(Date.now());
  const [date, setDate] = useState(today);
  const [name, setName] = useState(() => defaultSeasonName(new Date().getFullYear(), seasons));
  const [auto, setAuto] = useState(name); // nama otomatis terakhir; ikut berubah selama belum diubah pengguna
  const picked = parseDay(date) ?? new Date();

  function onDate(v: string) {
    setDate(v);
    const d = parseDay(v);
    if (d && name === auto) {
      const next = defaultSeasonName(d.getFullYear(), seasons);
      setName(next);
      setAuto(next);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const now = Date.now();
    let start = now;
    const d = parseDay(date);
    if (d && dkey(d) < dkey(now)) start = d.getTime(); // hanya boleh mundur, tidak ke depan
    createSeason({ name: name.trim() || defaultSeasonName(new Date().getFullYear(), seasons), startedAt: new Date(start).toISOString() });
    setStartNew(false);
    router.push("/");
  }

  return (
    <form className="card1 nx" onSubmit={onSubmit} noValidate>
      <h2>Panen baru</h2>
      <label htmlFor="npn">Nama panen</label>
      <input className="tx" id="npn" value={name} autoComplete="off" onChange={(e) => setName(e.target.value)} />
      <label htmlFor="npd">Tanggal mulai</label>
      <div className="dtw">
        <span className="dtv" aria-hidden="true">
          {dS(picked)}
        </span>
        <input
          className="dti"
          id="npd"
          type="date"
          value={date}
          max={today}
          onChange={(e) => onDate(e.target.value)}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker();
            } catch {
              /* beberapa browser tidak mendukung showPicker */
            }
          }}
        />
      </div>
      <p className="sub" style={{ margin: "10px 0 0" }}>
        Mulai {dW(picked)}. Panen sebelumnya tetap tersimpan di daftar.
      </p>
      <button className="bt p" type="submit">
        Mulai panen
      </button>
      <button className="bt" type="button" onClick={() => setStartNew(false)}>
        Batal
      </button>
    </form>
  );
}

export function PanenView() {
  const { seasons, backupAt, startNew, setStartNew, openSeason, setReportId, setIntent, reopenSeason, downloadBackup } = useData();
  const router = useRouter();
  const toast = useToast();

  const newest = [...seasons].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const running = [...seasons].reverse().find((s) => !s.closed);
  const totalSacks = seasons.reduce((a, s) => a + seasonCount(s), 0);
  const totalKg = seasons.reduce((a, s) => a + seasonTotal(s), 0);

  let next;
  if (running) {
    next = (
      <div className="card1 nx">
        <h2>Panen sedang berjalan</h2>
        <p className="sub">
          {running.name} dimulai {dS(running.startedAt)}. Tutup dulu kalau sudah selesai, baru bisa mulai panen berikutnya.
        </p>
        <button
          type="button"
          className="bt p"
          onClick={() => {
            openSeason(running.id);
            setIntent("close");
            router.push("/");
          }}
        >
          Selesai Catat Panen
        </button>
      </div>
    );
  } else if (startNew) {
    next = <NewSeasonForm />;
  } else {
    next = (
      <div className="card1 nx">
        <h2>Mulai panen berikutnya</h2>
        <p className="sub">Tiap panen punya nama dan tanggal sendiri. Panen lama tetap tersimpan.</p>
        <button type="button" className="bt p" onClick={() => setStartNew(true)}>
          Panen baru
        </button>
      </div>
    );
  }

  // Kelompokkan per tahun mulai, tahun terbaru di atas.
  const byYear = new Map<number, typeof newest>();
  newest.forEach((x) => {
    const y = new Date(x.startedAt).getFullYear();
    byYear.set(y, [...(byYear.get(y) ?? []), x]);
  });

  return (
    <>
      <div className="band">
        <h1 className="hi">Panen saya</h1>
        <Trio items={[[seasons.length, "Panen"], [totalSacks, "Karung"], [fmt(totalKg), "Total kg"]]} />
        <SackArt />
      </div>
      <div className="content">
        <div className="cols">
          <div className="l">
            {next}
            <div className="bkr">
              <i className={backupAt ? "" : "off"} />
              <span>{backupAt ? "Cadangan terakhir " + dS(backupAt) : "Belum pernah dicadangkan"}</span>
              <button type="button" className="lk" onClick={downloadBackup}>
                Unduh
              </button>
            </div>
          </div>
          <div className="r">
            <h2>Daftar panen</h2>
            {byYear.size ? (
              [...byYear.entries()].map(([year, group]) => (
                <Fragment key={year}>
                  <div className="yr">
                    <b>{year}</b>
                    <span>
                      {group.length} panen, {fmt(group.reduce((a, x) => a + seasonTotal(x), 0))} kg
                    </span>
                  </div>
                  {group.map((x) => (
                    <div className="pn" key={x.id}>
                      <div className="pt">
                        <div className="rt">
                          <b>{x.name}</b>
                          <span className={"tag " + (x.closed ? "n" : "g")}>{x.closed ? "Selesai" : "Berjalan"}</span>
                        </div>
                        <div className="kg big2">
                          {fmt(seasonTotal(x))}
                          <sup>kg</sup>
                        </div>
                      </div>
                      <p className="sub pi">
                        <b>{seasonPeriod(x)}</b>
                        <br />
                        {x.plots.length} lahan, {seasonCount(x)} karung
                      </p>
                      <div className="acts">
                        <button
                          type="button"
                          className="bt p sm"
                          onClick={() => {
                            openSeason(x.id);
                            router.push("/");
                          }}
                        >
                          Lihat Rincian
                        </button>
                        <button
                          type="button"
                          className="bt sm"
                          onClick={() => {
                            setReportId(x.id);
                            router.push("/laporan");
                          }}
                        >
                          Unduh Laporan
                        </button>
                        {x.closed && (
                          <button
                            type="button"
                            className="bt sm"
                            onClick={() => {
                              reopenSeason(x.id);
                              toast("Panen dibuka lagi");
                            }}
                          >
                            Buka lagi untuk koreksi
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </Fragment>
              ))
            ) : (
              <Empty icon="folder" title="Belum ada panen">
                Mulai dari Beranda.
              </Empty>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
