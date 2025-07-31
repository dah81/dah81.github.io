export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface ZamboniState {
  position: Position;
  direction: number; // angle in radians
  speed: number;
  isMoving: boolean;
  cleaningRadius: number;
}

export interface IceCell {
  x: number;
  y: number;
  isDirty: boolean;
  dirtLevel: number; // 0-100, 0 = clean, 100 = very dirty
}

export interface GameLevel {
  id: number;
  name: string;
  rinkSize: Size;
  initialDirtCoverage: number; // percentage
  targetCleanPercentage: number;
  timeLimit?: number; // in seconds, undefined for no limit
  zamboniSpeed: number;
  cleaningRadius: number;
}

export interface GameState {
  currentLevel: number;
  score: number;
  totalCleaned: number;
  isPlaying: boolean;
  isPaused: boolean;
  timeElapsed: number;
  zamboni: ZamboniState;
  iceGrid: IceCell[][];
  cleanPercentage: number;
  levelCompleted: boolean;
}

export interface GameStats {
  totalScore: number;
  levelsCompleted: number;
  bestTimes: { [levelId: number]: number };
  totalPlayTime: number;
}

export enum GameStatus {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  LEVEL_COMPLETE = 'level_complete',
  GAME_OVER = 'game_over'
}
