import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DuoBot",
    short_name: "DuoBot",
    description: "Ask Claude and Gemini side by side.",
    start_url: "/",
    display: "standalone",
    background_color: "#141413",
    theme_color: "#141413",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
