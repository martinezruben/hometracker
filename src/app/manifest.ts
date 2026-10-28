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
    background_color: "#f8fafc",
    theme_color: "#0f766e",
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
