// Global high score / career metrics persistence
// Stores aggregate and best-per-metric values.

const KEY = "zamboni.highscores.v1";

export type HighScores = {
  fastestTime?: { time: number; levelId: string };
  fewestBumps?: { bumps: number; levelId: string; time: number };
  highestClean?: { clean: number; levelId: string; time: number; bumps: number };
  bestComposite?: { score: number; levelId: string; time: number; bumps: number; clean: number };
  totalRuns?: number;
  totalIceCleanedPct?: number; // sum of cleanedPercent across runs
  perLevel?: Record<
    string,
    { time: number; bumps: number; clean: number; composite: number; runs: number }
  >;
};

function safeParse(raw: string | null): HighScores {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as HighScores;
  } catch {
    return {};
  }
}

function save(obj: HighScores) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch {}
}

export function getHighScores(): HighScores {
  if (typeof window === "undefined") return {};
  return safeParse(localStorage.getItem(KEY));
}

export function resetHighScores() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

// Composite formula: higher is better
export function computeComposite(time: number, bumps: number, clean: number) {
  return Math.round(clean * 1.2 - bumps * 3 - time * 0.55);
}

export function updateHighScores(levelId: string, time: number, bumps: number, clean: number) {
  if (typeof window === "undefined") return;
  const hs = getHighScores();
  hs.totalRuns = (hs.totalRuns || 0) + 1;
  hs.totalIceCleanedPct = (hs.totalIceCleanedPct || 0) + clean;
  if (!hs.perLevel) hs.perLevel = {};
  const compVal = computeComposite(time, bumps, clean);
  const prev = hs.perLevel[levelId];
  const improved =
    !prev ||
    time < prev.time ||
    compVal > prev.composite ||
    clean > prev.clean ||
    bumps < prev.bumps;
  if (improved) {
    hs.perLevel[levelId] = {
      time: prev ? Math.min(prev.time, time) : time,
      bumps: prev ? Math.min(prev.bumps, bumps) : bumps,
      clean: prev ? Math.max(prev.clean, clean) : clean,
      composite: prev ? Math.max(prev.composite, compVal) : compVal,
      runs: (prev?.runs || 0) + 1,
    };
  } else {
    hs.perLevel[levelId].runs = (prev?.runs || 0) + 1;
  }
  if (!hs.fastestTime || time < hs.fastestTime.time) hs.fastestTime = { time, levelId };
  if (
    !hs.fewestBumps ||
    bumps < hs.fewestBumps.bumps ||
    (bumps === hs.fewestBumps.bumps && time < hs.fewestBumps.time)
  ) {
    hs.fewestBumps = { bumps, levelId, time };
  }
  if (
    !hs.highestClean ||
    clean > hs.highestClean.clean ||
    (clean === hs.highestClean.clean && time < hs.highestClean.time)
  ) {
    hs.highestClean = { clean, levelId, time, bumps };
  }
  if (!hs.bestComposite || compVal > hs.bestComposite.score) {
    hs.bestComposite = { score: compVal, levelId, time, bumps, clean };
  }
  save(hs);
}
