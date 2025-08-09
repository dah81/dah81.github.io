import type { Palette } from "@/types/game";

export const TICK_RATE = 60; // Hz
export const DT = 1 / TICK_RATE;
export const BOOST_TICKS = Math.floor(0.25 * TICK_RATE); // 250ms

export const MAX_SPEED = 120; // world units per second (lower to reduce slide)
export const BOOST_EXTRA = 50;
export const ACCEL = 210; // a bit snappier throttle to feel more responsive
export const FRICTION = 130; // stronger overall decel to curb drift
export const TURN_RATE = Math.PI * 1.2; // slightly quicker steering

// Extra damping applied specifically to lateral (sideways) velocity per second
export const LATERAL_DAMP = 8; // higher means less sideways slide

export const DEFAULT_ZAMBONI = {
  width: 28,
  length: 42,
};

export const PALETTE: Palette = {
  iceLight: "#f6fbff",
  iceDark: "#e9f6ff",
  grime: "#8d8f95",
  board: "#0a1a2a",
  lineRed: "#d64949",
  lineBlue: "#3b6ac9",
  faceoff: "#2b2f7a",
  zBlue: "#1b4ea6",
  zWhite: "#f0f4ff",
  zTire: "#1b1b1b",
};

export const CLEAN_THRESHOLD = 100; // percent (require fully clean)
