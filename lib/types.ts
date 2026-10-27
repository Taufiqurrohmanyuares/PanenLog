/** Berat selalu bilangan bulat dalam 1/100 kg (5250 = 52,50 kg). */
export type Sack = { id: string; plotId: string; no: number; weight: number; createdAt: string };
export type Plot = { id: string; seasonId: string; name: string; done: boolean; createdAt: string; sacks: Sack[] };
export type Season = {
  id: string;
  name: string;
  startedAt: string;
  /** Terisi saat panen ditutup. */
  endedAt: string | null;
  closed: boolean;
  plots: Plot[];
};

export type AppUser = {
  id: string;
  name: string;
  email: string | null;
  /** true bila akun dibuat lewat Google (tidak punya kata sandi). */
  google: boolean;
  joinedAt: string | null;
  backupAt: string | null;
};

// Bentuk baris dari Supabase (hasil select bersarang)
export type SackRow = { id: string; plot_id: string; no: number; weight_x100: number; created_at: string };
export type PlotRow = { id: string; season_id: string; name: string; done: boolean; created_at: string; sacks: SackRow[] };
export type SeasonRow = {
  id: string;
  name: string;
  started_at: string;
  ended_at: string | null;
  closed: boolean;
  plots: PlotRow[];
};
