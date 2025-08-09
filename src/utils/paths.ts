// Centralized helpers to build URLs that honor the production basePath.
// Dev: served at root. Prod (static export): served under /zamboni-driver.
const base =
  typeof window !== "undefined"
    ? document.querySelector("base")?.getAttribute("href") || ""
    : process.env.NEXT_PUBLIC_BASE_PATH ||
      (process.env.NODE_ENV === "production" ? "/zamboni-driver" : "");

const norm = (p: string) => p.replace(/\+/g, "/").replace(/\/$/, "");
export const basePath = norm(base);

export function appPath(...segments: (string | number | undefined | null)[]) {
  const cleaned = segments
    .filter((s): s is string | number => s !== undefined && s !== null)
    .map(String)
    .map((s) => s.replace(/^\/+|\/+$/g, ""));
  const path = "/" + cleaned.join("/");
  return (basePath ? basePath + path : path) || "/";
}

export const paths = {
  home: appPath(),
  play: (levelId: string) => appPath("play", levelId),
};
