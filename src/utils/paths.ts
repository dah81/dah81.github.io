// Centralized helpers for internal route hrefs.
// IMPORTANT: Do NOT manually prefix Next.js basePath here; <Link> adds it automatically
// based on next.config.js basePath. We only compute basePath for the rare case you need
// an absolute browser URL (e.g., copying link to clipboard after export).
const runtimeBasePath =
  typeof window !== "undefined"
    ? document.querySelector("base")?.getAttribute("href") || ""
    : process.env.NEXT_PUBLIC_BASE_PATH ||
      (process.env.NODE_ENV === "production" ? "/zamboni-driver" : "");

const norm = (p: string) => p.replace(/\+/g, "/").replace(/\/$/, "");
export const basePath = norm(runtimeBasePath);

// Internal app navigation path (basePath NOT included intentionally)
export function appPath(...segments: (string | number | undefined | null)[]) {
  const cleaned = segments
    .filter((s): s is string | number => s !== undefined && s !== null)
    .map(String)
    .map((s) => s.replace(/^\/+|\/+$/g, ""));
  const joined = cleaned.join("/");
  return "/" + joined;
}

// Full path including basePath (use sparingly: for non-Next contexts like manual window.location)
export function fullAppPath(...segments: (string | number | undefined | null)[]) {
  const internal = appPath(...segments);
  return basePath ? basePath + internal : internal;
}

export const paths = {
  home: appPath(),
  play: (levelId: string) => appPath("play", levelId),
  full: {
    home: fullAppPath(),
    play: (levelId: string) => fullAppPath("play", levelId),
  },
};
