import { ICON_PATHS, type IconName } from "@/lib/assets";

export function Icon({ name, size = 24, stroke = 2 }: { name: IconName; size?: number; stroke?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      // Path ikon statis dari lib/assets.ts, bukan input pengguna.
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
    />
  );
}
