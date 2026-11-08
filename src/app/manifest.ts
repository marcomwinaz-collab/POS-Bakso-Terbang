import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "POS Bakso Terbang",
    short_name: "POS Bakso",
    description: "Aplikasi kasir dan dashboard Bakso Terbang",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fbf7f2",
    theme_color: "#d93408",
    lang: "id",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
