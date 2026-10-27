import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { fromRows, SEASON_SELECT } from "@/lib/data";
import { DataProvider } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import type { AppUser, SeasonRow } from "@/lib/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) redirect("/masuk");

  const [profile, seasons] = await Promise.all([
    supabase.from("profiles").select("name,created_at,backup_at").eq("id", claims.sub).maybeSingle(),
    supabase.from("seasons").select(SEASON_SELECT).order("started_at", { ascending: true }),
  ]);
  if (seasons.error) throw new Error(seasons.error.message);

  const user: AppUser = {
    id: claims.sub,
    name: profile.data?.name ?? claims.email?.split("@")[0] ?? "Pengguna",
    email: claims.email ?? null,
    google: claims.app_metadata?.provider === "google",
    joinedAt: profile.data?.created_at ?? null,
    backupAt: profile.data?.backup_at ?? null,
  };

  return (
    <DataProvider user={user} initialSeasons={fromRows((seasons.data ?? []) as unknown as SeasonRow[])}>
      <AppShell>{children}</AppShell>
    </DataProvider>
  );
}
