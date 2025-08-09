export type Vec2 = { x: number; y: number };

export type InputState = {
  active: boolean;
  dir: Vec2; // normalized direction of swipe/drag
  strength: number; // 0..1 throttle from drag length
  boostTicks: number; // frames remaining for flick boost
};

export type ZamboniState = {
  pos: Vec2;
  vel: Vec2;
  heading: number; // radians
  width: number;
  length: number;
};

export type TileGrid = {
  cols: number;
  rows: number;
  tile: number[]; // row-major dirt value [0..1]
};

export type Level = {
  id: string;
  name: string;
  difficulty?: 1 | 2 | 3; // stars
  description?: string;
  rink: {
    width: number; // world units
    height: number; // world units
    cornerRadius: number;
  };
  dirt: TileGrid; // starting dirt
  zamboniStart: Vec2;
  cleaningRadius: number; // world units
  cleaningRate: number; // per second
};

export type GameState = {
  level: Level;
  z: ZamboniState;
  input: InputState;
  cleanedPercent: number; // 0..100
  completed: boolean;
  elapsed: number; // seconds
  bumpCount: number; // number of times we bumped the boards
  wallContact: boolean; // currently touching/clamped to boards this frame
};

export type HUDStats = {
  cleanedPercent: number;
  time: number;
  bumps?: number;
};

export type Palette = {
  iceLight: string;
  iceDark: string;
  grime: string;
  board: string;
  lineRed: string;
  lineBlue: string;
  faceoff: string;
  zBlue: string;
  zWhite: string;
  zTire: string;
};
