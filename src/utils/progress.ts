// Simple local progress persistence using localStorage
// Stores completed level IDs as a string array under STORAGE_KEY.

const STORAGE_KEY = "zamboni.progress.v1";
const BEST_KEY = "zamboni.bestTimes.v1";

type ProgressData = { completed: string[] };
type BestTimes = Record<string, number>; // levelId -> best time in seconds

const safeParse = (raw: string | null): ProgressData => {
  if (!raw) return { completed: [] };
  try {
    const obj = JSON.parse(raw);
    if (obj && Array.isArray(obj.completed)) return { completed: obj.completed as string[] };
  } catch {
    // ignore
  }
  return { completed: [] };
};

export function getProgress(): { completed: Set<string> } {
  if (typeof window === "undefined") return { completed: new Set() };
  const data = safeParse(window.localStorage.getItem(STORAGE_KEY));
  return { completed: new Set(data.completed) };
}

export function markComplete(levelId: string): { completed: Set<string> } {
  if (typeof window === "undefined") return { completed: new Set([levelId]) };
  const current = getProgress().completed;
  current.add(levelId);
  const out: ProgressData = { completed: Array.from(current) };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  } catch {
    // storage may be unavailable; ignore
  }
  return { completed: current };
}

export function isComplete(levelId: string): boolean {
  return getProgress().completed.has(levelId);
}

const parseBest = (raw: string | null): BestTimes => {
  if (!raw) return {};
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object") return obj as BestTimes;
  } catch {}
  return {};
};

export function getBestTime(levelId: string): number | null {
  if (typeof window === "undefined") return null;
  const best = parseBest(window.localStorage.getItem(BEST_KEY));
  const v = best[levelId];
  return typeof v === "number" ? v : null;
}

export function setBestTime(levelId: string, timeSec: number): number {
  if (typeof window === "undefined") return timeSec;
  const best = parseBest(window.localStorage.getItem(BEST_KEY));
  const prev = best[levelId];
  if (typeof prev !== "number" || timeSec < prev) {
    best[levelId] = timeSec;
    try {
      window.localStorage.setItem(BEST_KEY, JSON.stringify(best));
    } catch {}
    return timeSec;
  }
  return prev;
}
