import type { Level, TileGrid } from "@/types/game";

const makeGrid = (cols: number, rows: number, fn: (x: number, y: number) => number): TileGrid => {
  const tile = new Array(cols * rows).fill(0).map((_, i) => {
    const x = i % cols;
    const y = Math.floor(i / cols);
    return Math.min(1, Math.max(0, fn(x, y)));
  });
  return { cols, rows, tile };
};

const baseDirt = (cols: number, rows: number, intensity = 0.75) =>
  makeGrid(cols, rows, (x, y) => {
    const nx = x / cols;
    const ny = y / rows;
    const v = intensity * (0.6 + 0.4 * Math.sin(8 * nx) * Math.cos(6 * ny));
    return v;
  });

export const LEVELS: Level[] = [
  {
    id: "level-1",
    name: "Backyard Pond",
    difficulty: 1,
    description: "Cozy backyard ice. Learn the basics and sweep clean lanes.",
    rink: { width: 640, height: 360, cornerRadius: 24 },
    dirt: baseDirt(64, 36, 0.65),
    zamboniStart: { x: 120, y: 180 },
    cleaningRadius: 26,
    cleaningRate: 1.1,
  },
  {
    id: "level-2",
    name: "Beer League Bash",
    difficulty: 2,
    description: "Beer league chaos: full sheet, streaky corners, board grime.",
    rink: { width: 800, height: 450, cornerRadius: 28 },
    dirt: makeGrid(80, 45, (x, y) => {
      const nx = x / 80;
      const ny = y / 45;
      // heavier bands and corners
      const band = 0.4 + 0.6 * Math.sin(10 * nx) ** 2;
      const cornerBoost =
        Math.max(0, 0.5 - Math.hypot(nx - 0, ny - 0)) * 0.7 +
        Math.max(0, 0.5 - Math.hypot(nx - 1, ny - 0)) * 0.7 +
        Math.max(0, 0.5 - Math.hypot(nx - 0, ny - 1)) * 0.7 +
        Math.max(0, 0.5 - Math.hypot(nx - 1, ny - 1)) * 0.7;
      return Math.min(1, 0.5 * band + 0.4 * cornerBoost);
    }),
    zamboniStart: { x: 180, y: 220 },
    cleaningRadius: 26,
    cleaningRate: 1.0,
  },
  {
    id: "level-3",
    name: "The Big Show",
    difficulty: 3,
    description: "Under the lights: pro sheet with heavy center wear and long lanes.",
    rink: { width: 960, height: 540, cornerRadius: 32 },
    dirt: makeGrid(96, 54, (x, y) => {
      const nx = x / 96;
      const ny = y / 54;
      const streaks = 0.6 + 0.4 * Math.sin(18 * (nx + ny));
      const centerMess = Math.max(0, 0.7 - Math.hypot(nx - 0.5, ny - 0.5)) * 0.6;
      return Math.min(1, 0.55 * streaks + 0.5 * centerMess);
    }),
    zamboniStart: { x: 220, y: 260 },
    cleaningRadius: 28,
    cleaningRate: 0.95,
  },
];

export const LEVEL_IDS = LEVELS.map((l) => l.id);
export const findLevel = (id: string) => LEVELS.find((l) => l.id === id) || LEVELS[0];
