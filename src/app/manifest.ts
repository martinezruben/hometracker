import type { MetadataRoute } from "next";
import { es } from "@/lib/i18n/es";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: es.app.name,
    short_name: es.app.name,
    description: es.app.description,
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#dbe6fb",
    theme_color: "#1d4ed8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
