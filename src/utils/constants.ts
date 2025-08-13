import type { Palette } from "@/types/game";

export const TICK_RATE = 60; // Hz
export const DT = 1 / TICK_RATE;
export const BOOST_TICKS = Math.floor(0.25 * TICK_RATE); // 250ms
// Fixed-step accumulator limits
export const MAX_SUBSTEPS = 4; // maximum simulation steps per frame to prevent catch-up spirals
export const MAX_FRAME_DT = 0.25; // seconds; clamp absurd stalls (e.g., tab backgrounded)

// Movement tuning (rolled back to original balanced feel)
// Slight incremental speed tweak: modestly higher top speed & acceleration.
export const MAX_SPEED = 128; // was 120 (~+6.7%)
export const BOOST_EXTRA = 52; // was 50 (scaled with top speed)
export const ACCEL = 225; // was 210 (~+7%)
export const FRICTION = 131; // tiny bump to keep control similar
export const TURN_RATE = Math.PI * 1.2; // slightly quicker steering

// Extra damping applied specifically to lateral (sideways) velocity per second
export const LATERAL_DAMP = 8; // higher means less sideways slide

export const DEFAULT_ZAMBONI = {
  width: 28,
  length: 42,
};

export const PALETTE: Palette = {
  // High contrast: pure white ice + neutral mid gray dirt
  iceLight: "#ffffff",
  iceDark: "#f2f7ff", // faint cool tint for subtle depth
  grime: "#5c5c5c", // darker neutral gray for stronger contrast
  board: "#0a1a2a",
  lineRed: "#d64949",
  lineBlue: "#3b6ac9",
  faceoff: "#2b2f7a",
  zBlue: "#1b4ea6",
  zWhite: "#f0f4ff",
  zTire: "#1b1b1b",
};

export const CLEAN_THRESHOLD = 100; // percent (require fully clean)
