import type { MetadataRoute } from "next";
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Zamboni: Clean Sheet",
    short_name: "Zamboni",
    description: "An 8-bit Blades of Steel-inspired Zamboni game.",
    start_url: ".",
    scope: ".",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0a1a2a",
    icons: [
      // Preferred PNGs for install prompts
      { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // SVG fallbacks for capable platforms
      { src: "zamboni-icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
    ],
  };
}
