import { IceCell, Position, Size, GameLevel, ZamboniState } from '@/types/game';
import { GAME_CONFIG, COLORS } from './constants';

/**
 * Initialize ice grid with random dirt patterns
 */
export function initializeIceGrid(rinkSize: Size, dirtCoverage: number): IceCell[][] {
  const gridWidth = Math.floor(rinkSize.width / GAME_CONFIG.GRID_SIZE);
  const gridHeight = Math.floor(rinkSize.height / GAME_CONFIG.GRID_SIZE);
  
  const grid: IceCell[][] = [];
  
  for (let y = 0; y < gridHeight; y++) {
    const row: IceCell[] = [];
    for (let x = 0; x < gridWidth; x++) {
      const isDirty = Math.random() * 100 < dirtCoverage;
      const dirtLevel = isDirty ? Math.random() * GAME_CONFIG.MAX_DIRT_LEVEL : 0;
      
      row.push({
        x,
        y,
        isDirty,
        dirtLevel,
      });
    }
    grid.push(row);
  }
  
  return grid;
}

/**
 * Calculate distance between two positions
 */
export function calculateDistance(pos1: Position, pos2: Position): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check collision between zamboni and rink boundaries with ROUNDED CORNERS!
 * � PERFECT CORNER CLEANING: Optimized for corner accessibility + boundary security
 */
export function checkBoundaryCollision(
  zamboniPos: Position, 
  rinkSize: Size, 
  zamboniSize: number = 42, // MEGA zamboni size
  cornerRadius: number = 35 // Corner radius matching cleaning radius
): boolean {
  const halfSize = zamboniSize / 2;
  
  // � CORNER CLEANING OPTIMIZATION: Reduce collision buffer for better corner access
  const collisionBuffer = halfSize * 0.7; // Reduced from full halfSize to 70% for better corner cleaning
  
  // Define the playable area boundaries with optimized buffer
  const minX = collisionBuffer;
  const maxX = rinkSize.width - collisionBuffer;
  const minY = collisionBuffer;
  const maxY = rinkSize.height - collisionBuffer;
  
  // If zamboni is completely within the straight sections, no collision
  if (zamboniPos.x >= cornerRadius + collisionBuffer && zamboniPos.x <= rinkSize.width - cornerRadius - collisionBuffer) {
    // In straight horizontal sections
    return zamboniPos.y < minY || zamboniPos.y > maxY;
  }
  
  if (zamboniPos.y >= cornerRadius + collisionBuffer && zamboniPos.y <= rinkSize.height - cornerRadius - collisionBuffer) {
    // In straight vertical sections
    return zamboniPos.x < minX || zamboniPos.x > maxX;
  }
  
  // In corner areas - check distance to corner center with optimized collision boundary
  let cornerCenter: Position;
  
  // Determine which corner we're in
  if (zamboniPos.x < cornerRadius + collisionBuffer && zamboniPos.y < cornerRadius + collisionBuffer) {
    // Top-left corner
    cornerCenter = { x: cornerRadius, y: cornerRadius };
  } else if (zamboniPos.x > rinkSize.width - cornerRadius - collisionBuffer && zamboniPos.y < cornerRadius + collisionBuffer) {
    // Top-right corner
    cornerCenter = { x: rinkSize.width - cornerRadius, y: cornerRadius };
  } else if (zamboniPos.x < cornerRadius + collisionBuffer && zamboniPos.y > rinkSize.height - cornerRadius - collisionBuffer) {
    // Bottom-left corner
    cornerCenter = { x: cornerRadius, y: rinkSize.height - cornerRadius };
  } else if (zamboniPos.x > rinkSize.width - cornerRadius - collisionBuffer && zamboniPos.y > rinkSize.height - cornerRadius - collisionBuffer) {
    // Bottom-right corner
    cornerCenter = { x: rinkSize.width - cornerRadius, y: rinkSize.height - cornerRadius };
  } else {
    // Not in a corner area, use basic boundary check
    return zamboniPos.x < minX || zamboniPos.x > maxX || zamboniPos.y < minY || zamboniPos.y > maxY;
  }
  
  // 🔧 PERFECT CORNER CLEANING: Allow zamboni closer to corner for optimal cleaning coverage
  const distanceToCorner = calculateDistance(zamboniPos, cornerCenter);
  return distanceToCorner > cornerRadius - collisionBuffer;
}

/**
 * Clean ice cells with OPTIMIZED PERFORMANCE for COLOSSAL levels
 * 🚀 Enhanced algorithm for smooth processing of massive 160,000+ cell grids
 */
export function cleanIceCells(
  grid: IceCell[][],
  zamboniPos: Position,
  cleaningRadius: number
): { grid: IceCell[][], cellsCleaned: number } {
  const newGrid = grid.map(row => [...row]);
  let cellsCleaned = 0;
  
  const gridX = Math.floor(zamboniPos.x / GAME_CONFIG.GRID_SIZE);
  const gridY = Math.floor(zamboniPos.y / GAME_CONFIG.GRID_SIZE);
  const radiusInCells = Math.ceil(cleaningRadius / GAME_CONFIG.GRID_SIZE);
  
  // 🚀 PERFORMANCE OPTIMIZATION: Reduce bounds checking overhead
  const minY = Math.max(0, gridY - radiusInCells);
  const maxY = Math.min(newGrid.length, gridY + radiusInCells + 1);
  const radiusSquared = cleaningRadius * cleaningRadius; // Use squared distance to avoid Math.sqrt
  
  // 🎯 OPTIMIZED CLEANING LOOP: Minimal calculations for maximum performance
  for (let y = minY; y < maxY; y++) {
    const row = newGrid[y];
    const minX = Math.max(0, gridX - radiusInCells);
    const maxX = Math.min(row.length, gridX + radiusInCells + 1);
    
    for (let x = minX; x < maxX; x++) {
      // Skip already clean cells for better performance
      if (!row[x].isDirty) continue;
      
      // 🚀 FAST DISTANCE CHECK: Use squared distance to avoid expensive Math.sqrt
      const cellCenterX = x * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2;
      const cellCenterY = y * GAME_CONFIG.GRID_SIZE + GAME_CONFIG.GRID_SIZE / 2;
      const dx = zamboniPos.x - cellCenterX;
      const dy = zamboniPos.y - cellCenterY;
      const distanceSquared = dx * dx + dy * dy;
      
      if (distanceSquared <= radiusSquared) {
        // 🚀 INSTANT COMPLETE CLEANING! Single-pass perfection!
        row[x].dirtLevel = 0; // Instant clean to 0!
        row[x].isDirty = false; // Mark as completely clean
        cellsCleaned++;
      }
    }
  }
  
  return { grid: newGrid, cellsCleaned };
}

/**
 * Calculate the percentage of clean ice
 */
export function calculateCleanPercentage(grid: IceCell[][]): number {
  let totalCells = 0;
  let cleanCells = 0;
  
  for (const row of grid) {
    for (const cell of row) {
      totalCells++;
      if (!cell.isDirty) {
        cleanCells++;
      }
    }
  }
  
  return totalCells > 0 ? (cleanCells / totalCells) * 100 : 0;
}

/**
 * Update zamboni position with CONSISTENT SMOOTH MOVEMENT for all levels
 * � FIXED: Simplified physics for reliable movement without getting stuck
 */
export function updateZamboniPosition(
  zamboni: ZamboniState,
  deltaTime: number,
  rinkSize: Size,
  cornerRadius: number = 35 // Corner radius for rounded rink collision
): ZamboniState {
  if (!zamboni.isMoving) return zamboni;
  
  // � SIMPLIFIED MOVEMENT: Consistent speed across all levels
  const speedMultiplier = 80; // Increased for better movement feel (was 60 with complex scaling)
  
  // 🔧 BETTER DELTATIME HANDLING: Less restrictive clamping for smoother movement
  const clampedDeltaTime = Math.min(deltaTime, 1/10); // Allow up to 10 FPS minimum (was 1/30 - too restrictive!)
  
  // Calculate smooth movement with simplified, reliable physics
  const newX = zamboni.position.x + Math.cos(zamboni.direction) * zamboni.speed * speedMultiplier * clampedDeltaTime;
  const newY = zamboni.position.y + Math.sin(zamboni.direction) * zamboni.speed * speedMultiplier * clampedDeltaTime;
  
  const newPosition = { x: newX, y: newY };
  
  // 🏒 Check boundaries with ROUNDED CORNER collision detection!
  if (checkBoundaryCollision(newPosition, rinkSize, 42, cornerRadius)) {
    // 🔧 IMPROVED COLLISION RESPONSE: Better bounce to prevent getting stuck
    // Add small random variation to prevent getting stuck in corners
    const randomOffset = (Math.random() - 0.5) * 0.2; // Small random angle adjustment
    return {
      ...zamboni,
      direction: zamboni.direction + Math.PI + randomOffset,
      isMoving: true, // Keep moving after bounce to prevent getting stuck
    };
  }
  
  return {
    ...zamboni,
    position: newPosition,
  };
}

/**
 * Get color for ice cell based on dirt level
 */
export function getIceCellColor(cell: IceCell): string {
  if (!cell.isDirty) return COLORS.ICE_CLEAN;
  
  if (cell.dirtLevel > 70) return COLORS.ICE_VERY_DIRTY;
  if (cell.dirtLevel > 30) return COLORS.ICE_DIRTY;
  
  // Interpolate between clean and dirty colors
  const intensity = cell.dirtLevel / 100;
  return `rgba(156, 163, 175, ${intensity * 0.8})`;
}

/**
 * Calculate score based on performance
 */
export function calculateLevelScore(
  cellsCleaned: number,
  timeElapsed: number,
  level: GameLevel,
  cleanPercentage: number
): number {
  let score = cellsCleaned * 10; // Base points per cell
  
  // Time bonus (faster completion = higher bonus)
  if (level.timeLimit) {
    const timeRemaining = Math.max(0, level.timeLimit - timeElapsed);
    score += Math.floor(timeRemaining * 5);
  }
  
  // Efficiency bonus
  if (cleanPercentage >= 95) {
    score += 1000; // High efficiency bonus
  }
  
  if (cleanPercentage >= 100) {
    score += 5000; // Perfect clean bonus
  }
  
  return score;
}

/**
 * Save game progress to localStorage
 */
export function saveGameProgress(gameState: any): void {
  try {
    localStorage.setItem('zamboni-game-save', JSON.stringify(gameState));
  } catch (error) {
    console.warn('Failed to save game progress:', error);
  }
}

/**
 * Load game progress from localStorage
 */
export function loadGameProgress(): any | null {
  try {
    const saved = localStorage.getItem('zamboni-game-save');
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Failed to load game progress:', error);
    return null;
  }
}
