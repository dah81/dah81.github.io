import type { GameState, Level, Vec2, ZamboniState, TileGrid } from "@/types/game";
import {
  ACCEL,
  BOOST_EXTRA,
  CLEAN_THRESHOLD,
  DEFAULT_ZAMBONI,
  DT,
  FRICTION,
  MAX_SPEED,
  TURN_RATE,
  LATERAL_DAMP,
} from "@/utils/constants";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const len = (v: Vec2) => Math.hypot(v.x, v.y);
const norm = (v: Vec2): Vec2 => {
  const l = len(v) || 1;
  return { x: v.x / l, y: v.y / l };
};
const scale = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });
const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });

export const createGame = (level: Level): GameState => {
  // Build a per-session seed so the dirt is more randomly placed each run
  const seed = makeSeed(level.id);
  const randomizedDirt = randomizeDirt(level.dirt, seed, level.id);
  const leveled: Level = { ...level, dirt: randomizedDirt };
  const z: ZamboniState = {
    pos: { ...level.zamboniStart },
    vel: { x: 0, y: 0 },
    heading: 0,
    width: DEFAULT_ZAMBONI.width,
    length: DEFAULT_ZAMBONI.length,
  };
  return {
    level: leveled,
    z,
    input: { active: false, dir: { x: 1, y: 0 }, strength: 0, boostTicks: 0 },
    cleanedPercent: 0,
    completed: false,
    elapsed: 0,
    bumpCount: 0,
    wallContact: false,
  };
};

export const integrate = (state: GameState) => {
  const { level, z } = state;
  const dir = state.input.dir;
  const throttle = state.input.strength;
  const boost = state.input.boostTicks > 0 ? BOOST_EXTRA : 0;

  // Turn towards input direction slowly to simulate heavy vehicle
  const targetAngle = Math.atan2(dir.y, dir.x);
  let delta = normalizeAngle(targetAngle - z.heading);
  const maxTurn = TURN_RATE * DT;
  delta = clamp(delta, -maxTurn, maxTurn);
  z.heading = normalizeAngle(z.heading + delta);

  // Acceleration
  const forward = { x: Math.cos(z.heading), y: Math.sin(z.heading) };
  const accel = ACCEL * throttle + boost;
  z.vel = add(z.vel, scale(forward, accel * DT));

  // Lateral damping: remove sideways component of velocity relative to heading
  // v = v_forward + v_side; project vel onto forward to keep forward, damp the rest
  const v = z.vel;
  const dot = v.x * forward.x + v.y * forward.y;
  const vForward = { x: forward.x * dot, y: forward.y * dot };
  const vSide = { x: v.x - vForward.x, y: v.y - vForward.y };
  const sideLen = len(vSide);
  if (sideLen > 0) {
    const damp = Math.max(0, 1 - LATERAL_DAMP * DT);
    const vSideNew = scale(vSide, damp);
    z.vel = add(vForward, vSideNew);
  }

  // Friction
  const vlen = len(z.vel);
  if (vlen > 0) {
    const decel = FRICTION * DT;
    const newLen = Math.max(0, vlen - decel);
    const f = newLen / vlen;
    z.vel = scale(z.vel, f);
  }

  // Clamp speed
  const sp = len(z.vel);
  if (sp > MAX_SPEED + boost) {
    z.vel = scale(norm(z.vel), MAX_SPEED + boost);
  }

  // Store previous position then integrate current position
  const prevPos = { ...z.pos };
  z.pos = add(z.pos, scale(z.vel, DT));

  // Collide with rink bounds (rounded corners approximated)
  const { width, height } = level.rink;
  const prevContact = state.wallContact;
  const minX = 0 + 8;
  const maxX = width - 8;
  const minY = 0 + 8;
  const maxY = height - 8;
  const beforeX = z.pos.x;
  const beforeY = z.pos.y;
  z.pos.x = clamp(z.pos.x, minX, maxX);
  z.pos.y = clamp(z.pos.y, minY, maxY);
  const contact = beforeX !== z.pos.x || beforeY !== z.pos.y;
  state.wallContact = contact;
  if (contact && !prevContact) {
    state.bumpCount += 1;
  }

  // Apply single-pass cleaning at current and previous positions to avoid gaps at high speed
  applyCleaningAt(state, z.pos);
  applyCleaningAt(state, prevPos);

  // Time & completion
  state.elapsed += DT;
  state.input.boostTicks = Math.max(0, state.input.boostTicks - 1);
  state.cleanedPercent = computeCleanPercent(level.dirt);
  state.completed = state.cleanedPercent >= CLEAN_THRESHOLD;
};

const normalizeAngle = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
};

// Single-pass cleaning helper: instantly clears tiles under the squeegee footprint.
const applyCleaningAt = (state: GameState, position: Vec2) => {
  const { level } = state;
  const grid = level.dirt;
  // Expand radius slightly to cover gaps between frames
  const r = level.cleaningRadius * 1.05;
  // Offset towards back (squeegee) so direction doesn't over-clean forward
  const backOffset = {
    x: -Math.cos(state.z.heading) * (state.z.length * 0.45),
    y: -Math.sin(state.z.heading) * (state.z.length * 0.45),
  };
  const c = add(position, backOffset);
  const cellW = level.rink.width / grid.cols;
  const cellH = level.rink.height / grid.rows;

  const minX = clamp(Math.floor((c.x - r) / cellW), 0, grid.cols - 1);
  const maxX = clamp(Math.ceil((c.x + r) / cellW), 0, grid.cols - 1);
  const minY = clamp(Math.floor((c.y - r) / cellH), 0, grid.rows - 1);
  const maxY = clamp(Math.ceil((c.y + r) / cellH), 0, grid.rows - 1);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const cx = x * cellW + cellW / 2;
      const cy = y * cellH + cellH / 2;
      const d = Math.hypot(cx - c.x, cy - c.y);
      if (d <= r) {
        const idx = y * grid.cols + x;
        if (grid.tile[idx] > 0) grid.tile[idx] = 0; // instant clean
      }
    }
  }
};

export const computeCleanPercent = (grid: TileGrid) => {
  let sum = 0;
  for (let i = 0; i < grid.tile.length; i++) sum += grid.tile[i];
  const avg = sum / grid.tile.length; // 1 means dirty, 0 means clean
  return (1 - avg) * 100;
};

export const toScreen = (
  world: Vec2,
  canvasW: number,
  canvasH: number,
  rinkW: number,
  rinkH: number,
) => {
  return { x: (world.x / rinkW) * canvasW, y: (world.y / rinkH) * canvasH };
};

export const fromInputDrag = (dx: number, dy: number) => {
  const l = Math.hypot(dx, dy);
  // Lower deadzone for mobile; tiny drags still count
  if (l < 5) return { dir: { x: 1, y: 0 }, strength: 0 };
  const dir = { x: dx / l, y: dy / l };
  // Reach full throttle with shorter drag distance
  const strength = clamp(l / 80, 0, 1);
  return { dir, strength };
};

export const tickMany = (state: GameState, ticks: number) => {
  for (let i = 0; i < ticks; i++) integrate(state);
};

// --- Dirt randomization helpers ---

function makeSeed(levelId: string): number {
  // Mix level id with a session-random component
  let h = 2166136261 >>> 0; // FNV offset basis
  for (let i = 0; i < levelId.length; i++) {
    h ^= levelId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let extra = 0;
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    extra = arr[0] >>> 0;
  } else {
    extra = Math.floor(Math.random() * 0xffffffff) >>> 0;
  }
  return (h ^ extra) >>> 0;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoiseField(cols: number, rows: number, rng: () => number, blurPasses = 3): number[] {
  // Start with white noise
  let field = new Array(cols * rows).fill(0).map(() => rng());
  // Box blur passes to create smooth clusters
  const idx = (x: number, y: number) => y * cols + x;
  for (let p = 0; p < blurPasses; p++) {
    const next = field.slice();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = Math.min(cols - 1, Math.max(0, x + dx));
            const yy = Math.min(rows - 1, Math.max(0, y + dy));
            sum += field[idx(xx, yy)];
            count++;
          }
        }
        next[idx(x, y)] = sum / count;
      }
    }
    field = next;
  }
  // Normalize to [0,1]
  let min = Infinity,
    max = -Infinity;
  for (const v of field) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = Math.max(1e-6, max - min);
  return field.map((v) => (v - min) / range);
}

function randomizeDirt(base: TileGrid, seed: number, levelId: string): TileGrid {
  const { cols, rows } = base;
  const rng = mulberry32(seed >>> 0);
  // More blur for higher levels to create larger clusters
  const blur = levelId === "level-3" ? 4 : levelId === "level-2" ? 3 : 2;
  const noise = makeNoiseField(cols, rows, rng, blur);
  // Mix base pattern with noise; weight noise higher to feel more random
  const out: number[] = new Array(cols * rows);
  for (let i = 0; i < out.length; i++) {
    const b = base.tile[i];
    const n = noise[i];
    // Shape noise to emphasize pockets (ease curve)
    const nShaped = Math.pow(n, 1.3);
    // Blend; clamp to [0,1]
    const v = Math.min(1, Math.max(0, 0.35 * b + 0.8 * nShaped));
    out[i] = v;
  }
  return { cols, rows, tile: out };
}
