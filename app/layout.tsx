import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/toast";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "PanenLog", template: "%s | PanenLog" },
  description: "Buku timbang digital. Catat berat tiap karung hasil panen, jumlahnya dihitung sendiri.",
  applicationName: "PanenLog",
  appleWebApp: { capable: true, title: "PanenLog", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F8E6" },
    { media: "(prefers-color-scheme: dark)", color: "#141A10" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={dmSans.variable}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
