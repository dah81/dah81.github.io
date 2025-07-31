'use client';

import React from 'react';
import { useGameState } from '@/hooks/useGameState';
import { useGameLoop } from '@/hooks/useGameLoop';
import { GameStatus } from '@/types/game';
import { MainMenu } from '@/components/UI/MainMenu';
import { LevelComplete } from '@/components/UI/LevelComplete';
import { GameBoard } from './GameBoard';

export function Game() {
  const {
    gameStatus,
    gameState,
    currentLevel,
    startGame,
    togglePause,
    updateZamboniMovement,
    gameTick,
    resetToMenu,
    nextLevel,
    restartLevel,
  } = useGameState();

  // Game loop - only active when playing
  useGameLoop(
    gameTick,
    gameStatus === GameStatus.PLAYING
  );

  // Render based on game status
  const renderGameScreen = () => {
    switch (gameStatus) {
      case GameStatus.MENU:
        return <MainMenu onStartGame={startGame} />;

      case GameStatus.PLAYING:
      case GameStatus.PAUSED:
        if (!gameState || !currentLevel) return null;
        return (
          <GameBoard
            gameState={gameState}
            level={currentLevel}
            gameStatus={gameStatus}
            onZamboniMovement={updateZamboniMovement}
            onPause={togglePause}
            onRestart={restartLevel}
          />
        );

      case GameStatus.LEVEL_COMPLETE:
        if (!gameState || !currentLevel) return null;
        return (
          <LevelComplete
            gameState={gameState}
            level={currentLevel}
            onNextLevel={nextLevel}
            onRestartLevel={restartLevel}
            onMainMenu={resetToMenu}
          />
        );

      case GameStatus.GAME_OVER:
        // For now, treat game over same as level complete
        // You could create a separate GameOver component here
        if (!gameState || !currentLevel) return null;
        return (
          <LevelComplete
            gameState={gameState}
            level={currentLevel}
            onNextLevel={nextLevel}
            onRestartLevel={restartLevel}
            onMainMenu={resetToMenu}
          />
        );

      default:
        return <MainMenu onStartGame={startGame} />;
    }
  };

  return (
    <div className="w-full h-full">
      {renderGameScreen()}
    </div>
  );
}
