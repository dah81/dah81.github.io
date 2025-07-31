import { GameLevel } from '@/types/game';

// Game configuration constants
export const GAME_CONFIG = {
  TICK_RATE: 60, // FPS
  GRID_SIZE: 8, // Size of each ice cell in pixels
  MAX_DIRT_LEVEL: 100,
  CLEANING_EFFICIENCY: 100, // INSTANT COMPLETE CLEANING! Single-pass perfection!
  AUTO_SAVE_INTERVAL: 5000, // Auto save every 5 seconds
};

// Hockey rink dimensions (scaled down for game)
export const RINK_DIMENSIONS = {
  NHL_WIDTH: 960, // 480 → 960 pixels (+100% COLOSSAL!)
  NHL_HEIGHT: 400,  // 200 → 400 pixels (+100% COLOSSAL!)
  PRACTICE_WIDTH: 600, // 300 → 600 (+100% COLOSSAL!)
  PRACTICE_HEIGHT: 300, // 150 → 300 (+100% COLOSSAL!)
};

// Color schemes
export const COLORS = {
  ICE_CLEAN: '#E6F3FF', // Light blue-white
  ICE_DIRTY: '#9CA3AF', // Gray
  ICE_VERY_DIRTY: '#6B7280', // Darker gray
  RINK_LINES: '#FF0000', // Red lines
  RINK_CIRCLES: '#0000FF', // Blue circles
  ZAMBONI_BODY: '#3B82F6', // Professional Blue (was gold/yellow)
  ZAMBONI_TRIM: '#FFFFFF', // Clean White (was red)
  BACKGROUND: '#F8FAFC', // Light background
  UI_PRIMARY: '#1E40AF', // Blue
  UI_SUCCESS: '#059669', // Green
  UI_WARNING: '#D97706', // Orange
};

// Game levels configuration
export const GAME_LEVELS: GameLevel[] = [
  {
    id: 1,
    name: "Practice Arena",
    rinkSize: { width: RINK_DIMENSIONS.PRACTICE_WIDTH, height: RINK_DIMENSIONS.PRACTICE_HEIGHT },
    initialDirtCoverage: 30, // 30% dirty
    targetCleanPercentage: 85,
    zamboniSpeed: 3.5,
    cleaningRadius: 35, // WIDER CLEANING! 15→35px (+133% wider than original!)
  },
  {
    id: 2,
    name: "NHL Stadium",
    rinkSize: { width: RINK_DIMENSIONS.NHL_WIDTH, height: RINK_DIMENSIONS.NHL_HEIGHT },
    initialDirtCoverage: 50, // 50% dirty
    targetCleanPercentage: 90,
    zamboniSpeed: 4,
    cleaningRadius: 35, // WIDER CLEANING! 15→35px (+133% wider than original!)
  },
  {
    id: 3,
    name: "Speed Clean Challenge",
    rinkSize: { width: RINK_DIMENSIONS.NHL_WIDTH, height: RINK_DIMENSIONS.NHL_HEIGHT },
    initialDirtCoverage: 40,
    targetCleanPercentage: 95,
    timeLimit: 360, // 6 minutes (increased for colossal scale)
    zamboniSpeed: 6,
    cleaningRadius: 40, // WIDER CLEANING! 20→40px (+100% wider than original!)
  },
];

// Zamboni movement keys
export const CONTROLS = {
  UP: ['ArrowUp', 'KeyW'],
  DOWN: ['ArrowDown', 'KeyS'],
  LEFT: ['ArrowLeft', 'KeyA'],
  RIGHT: ['ArrowRight', 'KeyD'],
  PAUSE: ['Space', 'KeyP'],
};

// Scoring system
export const SCORING = {
  POINTS_PER_CELL: 10,
  TIME_BONUS_MULTIPLIER: 2,
  EFFICIENCY_BONUS: 1000, // Bonus for completing with high efficiency
  PERFECT_CLEAN_BONUS: 5000, // Bonus for 100% clean
};
