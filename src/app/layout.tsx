import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
import { es } from "@/lib/i18n/es";
import { PwaRegister } from "@/components/PwaRegister";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SyncManager } from "@/components/SyncManager";
import { SyncStatus } from "@/components/SyncStatus";

export const metadata: Metadata = {
  title: es.app.name,
  description: es.app.description,
  applicationName: es.app.name,
  appleWebApp: {
    capable: true,
    title: es.app.name,
    statusBarStyle: "default",
  },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#dbe6fb",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <OfflineBanner />
        <SyncStatus />
        {children}
        <PwaRegister />
        <SyncManager />
      </body>
    </html>
  );
}
