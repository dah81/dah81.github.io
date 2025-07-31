'use client';

import { useState, useCallback, useRef } from 'react';
import { GameState, GameStatus, ZamboniState } from '@/types/game';
import { GAME_LEVELS } from '@/utils/constants';
import { 
  initializeIceGrid, 
  cleanIceCells, 
  calculateCleanPercentage,
  updateZamboniPosition,
  calculateLevelScore,
  saveGameProgress
} from '@/utils/gameLogic';

export function useGameState() {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const gameStateRef = useRef<GameState | null>(null);
  const [, forceUpdate] = useState({});

  // Force re-render
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  // Initialize a new game level
  const initializeLevel = useCallback((levelIndex: number) => {
    const level = GAME_LEVELS[levelIndex];
    if (!level) return;

    const iceGrid = initializeIceGrid(level.rinkSize, level.initialDirtCoverage);
    
    const zamboni: ZamboniState = {
      position: { 
        x: level.rinkSize.width / 2, 
        y: level.rinkSize.height / 2 
      },
      direction: 0,
      speed: level.zamboniSpeed,
      isMoving: false,
      cleaningRadius: level.cleaningRadius,
    };

    gameStateRef.current = {
      currentLevel: levelIndex,
      score: 0,
      totalCleaned: 0,
      isPlaying: false,
      isPaused: false,
      timeElapsed: 0,
      zamboni,
      iceGrid,
      cleanPercentage: calculateCleanPercentage(iceGrid),
      levelCompleted: false,
    };

    setCurrentLevelIndex(levelIndex);
    triggerUpdate();
  }, [triggerUpdate]);

  // Start the game
  const startGame = useCallback((levelIndex: number = 0) => {
    initializeLevel(levelIndex);
    setGameStatus(GameStatus.PLAYING);
    if (gameStateRef.current) {
      gameStateRef.current.isPlaying = true;
    }
    triggerUpdate();
  }, [initializeLevel, triggerUpdate]);

  // Pause/Resume game
  const togglePause = useCallback(() => {
    if (!gameStateRef.current) return;

    if (gameStatus === GameStatus.PLAYING) {
      setGameStatus(GameStatus.PAUSED);
      gameStateRef.current.isPaused = true;
    } else if (gameStatus === GameStatus.PAUSED) {
      setGameStatus(GameStatus.PLAYING);
      gameStateRef.current.isPaused = false;
    }
    triggerUpdate();
  }, [gameStatus, triggerUpdate]);

  // Update zamboni movement
  const updateZamboniMovement = useCallback((direction: number, isMoving: boolean) => {
    if (!gameStateRef.current || gameStatus !== GameStatus.PLAYING) return;

    gameStateRef.current.zamboni.direction = direction;
    gameStateRef.current.zamboni.isMoving = isMoving;
    triggerUpdate();
  }, [gameStatus, triggerUpdate]);

  // Game tick - FIXED for consistent smooth movement without getting stuck
  const gameTick = useCallback((deltaTime: number) => {
    if (!gameStateRef.current || gameStatus !== GameStatus.PLAYING) return;

    const level = GAME_LEVELS[gameStateRef.current.currentLevel];
    if (!level) return;

    // � FIX: Less aggressive frame skipping - only skip extremely long frames
    if (deltaTime > 0.5) return; // Only skip frames longer than 500ms (was 100ms - too aggressive!)

    // Update time
    gameStateRef.current.timeElapsed += deltaTime;

    // 🚀 SMOOTH ZAMBONI MOVEMENT: Enhanced physics for all rink sizes
    gameStateRef.current.zamboni = updateZamboniPosition(
      gameStateRef.current.zamboni,
      deltaTime,
      level.rinkSize,
      level.cleaningRadius // Use cleaning radius as corner radius for perfect fit!
    );

    // Clean ice if zamboni is moving
    if (gameStateRef.current.zamboni.isMoving) {
      const { grid, cellsCleaned } = cleanIceCells(
        gameStateRef.current.iceGrid,
        gameStateRef.current.zamboni.position,
        gameStateRef.current.zamboni.cleaningRadius
      );

      gameStateRef.current.iceGrid = grid;
      gameStateRef.current.totalCleaned += cellsCleaned;
    }

    // Update clean percentage
    gameStateRef.current.cleanPercentage = calculateCleanPercentage(gameStateRef.current.iceGrid);

    // Check level completion
    if (gameStateRef.current.cleanPercentage >= level.targetCleanPercentage && !gameStateRef.current.levelCompleted) {
      gameStateRef.current.levelCompleted = true;
      gameStateRef.current.score = calculateLevelScore(
        gameStateRef.current.totalCleaned,
        gameStateRef.current.timeElapsed,
        level,
        gameStateRef.current.cleanPercentage
      );
      
      setGameStatus(GameStatus.LEVEL_COMPLETE);
      saveGameProgress(gameStateRef.current);
    }

    // Check time limit
    if (level.timeLimit && gameStateRef.current.timeElapsed >= level.timeLimit) {
      setGameStatus(GameStatus.GAME_OVER);
    }

    triggerUpdate();
  }, [gameStatus, triggerUpdate]);

  // Reset to menu
  const resetToMenu = useCallback(() => {
    setGameStatus(GameStatus.MENU);
    gameStateRef.current = null;
    triggerUpdate();
  }, [triggerUpdate]);

  // Next level
  const nextLevel = useCallback(() => {
    const nextLevelIndex = currentLevelIndex + 1;
    if (nextLevelIndex < GAME_LEVELS.length) {
      startGame(nextLevelIndex);
    } else {
      resetToMenu();
    }
  }, [currentLevelIndex, startGame, resetToMenu]);

  // Restart current level
  const restartLevel = useCallback(() => {
    // 🔧 PROGRESS RESET BUG FIX: Explicitly reset progress indicator immediately
    if (gameStateRef.current) {
      gameStateRef.current.cleanPercentage = 0;
      gameStateRef.current.totalCleaned = 0;
      gameStateRef.current.timeElapsed = 0;
      gameStateRef.current.levelCompleted = false;
    }
    
    // Force immediate UI re-render to show reset progress
    triggerUpdate();
    
    // Initialize the level with fresh state
    startGame(currentLevelIndex);
  }, [currentLevelIndex, startGame, triggerUpdate]);

  return {
    gameStatus,
    gameState: gameStateRef.current,
    currentLevel: gameStateRef.current ? GAME_LEVELS[gameStateRef.current.currentLevel] : null,
    startGame,
    togglePause,
    updateZamboniMovement,
    gameTick,
    resetToMenu,
    nextLevel,
    restartLevel,
  };
}
