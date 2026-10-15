import type { MetadataRoute } from "next";
import { DESIGN_TOKENS } from "@/lib/tokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AKSESPASS",
    short_name: "AKSESPASS",
    description:
      "Sampaikan kebutuhan layanan kesehatan dengan kontrol persetujuan di tangan pasien.",
    lang: "id",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: DESIGN_TOKENS["--bg-page"],
    theme_color: DESIGN_TOKENS["--btn-primary"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
