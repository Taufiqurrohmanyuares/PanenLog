"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Icon } from "@/components/icon";
import type { IconName } from "@/lib/assets";
import { useData } from "@/lib/store";

export const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Beranda", icon: "home" },
  { href: "/panen", label: "Panen", icon: "folder" },
  { href: "/laporan", label: "Laporan", icon: "doc" },
];
const NAV = [...TABS, { href: "/akun", label: "Akun", icon: "user" as IconName }];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

/** Ilustrasi ladang dan karung di pojok kanan bawah banner. */
export function SackArt() {
  return (
    <div className="sack" aria-hidden="true">
    <svg aria-hidden="true" preserveAspectRatio="xMaxYMax meet" viewBox="0 0 400 240">
      <circle cx="318" cy="62" fill="#FFF3B0" r="30" />
      <path d="M0 240L60 150L110 128L190 70L262 132L330 100L400 140V240Z" fill="#D6EA8C" />
      <path d="M0 240C40 190 120 160 180 152S320 134 400 158V240Z" fill="#B6D94A" />
      <path d="M0 240C60 204 130 194 200 186S330 172 400 190V240Z" fill="#98C530" />
      <path d="M0 240C80 218 150 214 230 208S350 200 400 212V240Z" fill="#6E8F25" />
      <g transform="translate(230 138) scale(.55)">
      <path d="M128 140C120 114 122 88 136 70L145 58H169L178 70C192 88 194 114 186 140Z" fill="#E8D8A8" />
      <path d="M143 58C145 44 169 44 171 58Z" fill="#D4BF7E" />
      <path d="M141 60H173" stroke="#9A7B2F" strokeLinecap="round" strokeWidth="3.5" />
      <rect fill="#FBF6E3" height="34" rx="8" width="28" x="143" y="84" />
      <path d="M157 114V92" stroke="#6F8F2A" strokeLinecap="round" strokeWidth="2.5" />
      <path d="M157 98c-5-1-7-5-7-8 4 0 7 3 7 8zM157 98c5-1 7-5 7-8-4 0-7 3-7 8zM157 106c-5-1-7-5-7-8 4 0 7 3 7 8zM157 106c5-1 7-5 7-8-4 0-7 3-7 8z" fill="#6F8F2A" />
      </g>
      <path d="M400 240V168C378 178 364 200 360 240Z" fill="#4F6B1A" />
      <path d="M400 240V192C388 198 380 216 380 240Z" fill="#3E5614" />
    </svg>
    </div>
  );
}

/** Ikon aplikasi (daun di dalam gelembung). Dipakai di navbar dan halaman masuk. */
export function LogoMark() {
  return (
    <svg className="lg" aria-hidden="true" viewBox="68 62 546 556">
      <rect fill="#71856D" height="550" rx="100" width="540" x="70" y="65" />
      <path d="M190 155H430C490 155 525 200 525 260C525 330 475 395 390 410C330 420 295 445 270 490L225 545C205 535 195 500 190 440Z" fill="#FBF7EC" />
      <path d="M228 500C225 400 270 280 380 205" fill="none" stroke="#4E6A4A" strokeLinecap="round" strokeWidth="6" />
      <g fill="#D9B27A">
      <ellipse cx="332" cy="330" rx="24" ry="9" transform="rotate(-50 332 330)" />
      <ellipse cx="360" cy="304" rx="24" ry="9" transform="rotate(-50 360 304)" />
      <ellipse cx="390" cy="280" rx="24" ry="9" transform="rotate(-50 390 280)" />
      <ellipse cx="420" cy="256" rx="24" ry="9" transform="rotate(-50 420 256)" />
      <ellipse cx="448" cy="232" rx="22" ry="8" transform="rotate(-50 448 232)" />
      </g>
    </svg>
  );
}

export function Brand() {
  return (
    <Link className="brand" href="/">
      <LogoMark />
      <span className="bw">
        Panen<b>Log</b>
      </span>
    </Link>
  );
}

/** Navbar atas, hidup di luar .band. Dipakai oleh AppShell. */
export function TopBarShell() {
  const { user } = useData();
  const path = usePathname();
  return (
    <div className="tbar">
      <Brand />
      <nav className="dp" aria-label="Menu halaman">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} aria-current={isActive(path, t.href) ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
      <Link className="av2" href="/akun" aria-label={`Akun saya, ${user.name}`}>
        {user.name.charAt(0).toUpperCase()}
      </Link>
    </div>
  );
}

/** Navigasi bawah di ponsel: bilah melayang dengan ikon aktif berlatar penuh. */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bn" aria-label="Menu utama">
      {NAV.map((t) => (
        <Link key={t.href} href={t.href} aria-current={isActive(path, t.href) ? "page" : undefined}>
          <i>
            <Icon name={t.icon} size={20} stroke={2} />
          </i>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function Trio({ items }: { items: [string | number, string][] }) {
  return (
    <div className="trio">
      {items.map(([v, l]) => (
        <div key={l}>
          <small>{l}</small>
          <b>{v}</b>
        </div>
      ))}
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: IconName; title: string; children: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} size={36} stroke={1.6} />
      <b>{title}</b>
      {children}
    </div>
  );
}

/** Kotak konfirmasi kuning */
export function Confirm({
  title,
  children,
  yes,
  no,
  onYes,
  onNo,
  danger,
  style,
}: {
  title: string;
  children?: ReactNode;
  yes: string;
  no: string;
  onYes: () => void;
  onNo: () => void;
  danger?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className="warn" style={style}>
      <b>{title}</b>
      {children && (
        <>
          <br />
          {children}
        </>
      )}
      <div className="acts">
        <button type="button" className={"bt sm " + (danger ? "dg" : "p")} onClick={onYes}>
          {yes}
        </button>
        <button type="button" className="bt sm" onClick={onNo}>
          {no}
        </button>
      </div>
    </div>
  );
}
