import type { Plot, Season, SeasonRow } from "./types";

/** Select bersarang: panen > lahan > karung, sekali jalan. */
export const SEASON_SELECT =
  "id,name,started_at,ended_at,closed,plots(id,season_id,name,done,created_at,sacks(id,plot_id,no,weight_x100,created_at))";

/** Season -> baris untuk fungsi replace_all_data (lihat migrasi 0002). */
export function toPayload(list: Season[]) {
  return list.map((s) => ({
    id: s.id,
    name: s.name,
    started_at: s.startedAt,
    ended_at: s.endedAt,
    closed: s.closed,
    plots: s.plots.map((p) => ({
      id: p.id,
      name: p.name,
      done: p.done,
      created_at: p.createdAt,
      sacks: p.sacks.map((e) => ({ id: e.id, no: e.no, weight_x100: e.weight, created_at: e.createdAt })),
    })),
  }));
}

/** Baris database -> model aplikasi, dengan urutan yang stabil. */
export function fromRows(rows: SeasonRow[]): Season[] {
  return rows
    .map((s) => ({
      id: s.id,
      name: s.name,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      closed: s.closed,
      plots: (s.plots ?? [])
        .map<Plot>((p) => ({
          id: p.id,
          seasonId: p.season_id,
          name: p.name,
          done: p.done,
          createdAt: p.created_at,
          sacks: (p.sacks ?? [])
            .map((e) => ({ id: e.id, plotId: e.plot_id, no: e.no, weight: e.weight_x100, createdAt: e.created_at }))
            .sort((a, b) => a.no - b.no),
        }))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    }))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}
