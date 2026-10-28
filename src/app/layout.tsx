import type { Metadata, Viewport } from "next";
import "./globals.css";
import { es } from "@/lib/i18n/es";
import { BottomNav } from "@/components/BottomNav";
import { PwaRegister } from "@/components/PwaRegister";
import { OfflineBanner } from "@/components/OfflineBanner";

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
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <OfflineBanner />
        <main className="flex-1 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-24">
          {children}
        </main>
        <BottomNav />
        <PwaRegister />
      </body>
    </html>
  );
}
