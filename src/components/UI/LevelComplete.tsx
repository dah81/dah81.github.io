'use client';

import React from 'react';
import { GameState, GameLevel } from '@/types/game';
import { GAME_LEVELS } from '@/utils/constants';

interface LevelCompleteProps {
  gameState: GameState;
  level: GameLevel;
  onNextLevel: () => void;
  onRestartLevel: () => void;
  onMainMenu: () => void;
}

export function LevelComplete({ 
  gameState, 
  level, 
  onNextLevel, 
  onRestartLevel, 
  onMainMenu 
}: LevelCompleteProps) {
  const isLastLevel = gameState.currentLevel >= GAME_LEVELS.length - 1;
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPerformanceRating = (): { rating: string; emoji: string; color: string } => {
    if (gameState.cleanPercentage >= 100) {
      return { rating: 'Perfect!', emoji: '🌟', color: 'text-yellow-600' };
    } else if (gameState.cleanPercentage >= 95) {
      return { rating: 'Excellent!', emoji: '🏆', color: 'text-blue-600' };
    } else if (gameState.cleanPercentage >= 90) {
      return { rating: 'Great!', emoji: '🎉', color: 'text-green-600' };
    } else {
      return { rating: 'Good!', emoji: '👍', color: 'text-purple-600' };
    }
  };

  const performance = getPerformanceRating();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-400 via-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-lg w-full text-center">
        {/* Success Animation */}
        <div className="text-6xl mb-4 animate-bounce">
          {performance.emoji}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Level Complete!
        </h1>
        
        <h2 className={`text-xl font-semibold mb-6 ${performance.color}`}>
          {performance.rating}
        </h2>

        {/* Level Info */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-bold text-lg text-gray-800 mb-2">
            {level.name}
          </h3>
          <div className="text-sm text-gray-600">
            Level {level.id} • Target: {level.targetCleanPercentage}%
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xs font-medium text-blue-600 uppercase tracking-wide">
              Clean Percentage
            </div>
            <div className="text-2xl font-bold text-blue-800">
              {gameState.cleanPercentage.toFixed(1)}%
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xs font-medium text-green-600 uppercase tracking-wide">
              Final Score
            </div>
            <div className="text-2xl font-bold text-green-800">
              {gameState.score.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-xs font-medium text-purple-600 uppercase tracking-wide">
              Time Taken
            </div>
            <div className="text-2xl font-bold text-purple-800">
              {formatTime(gameState.timeElapsed)}
            </div>
          </div>
          
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-xs font-medium text-orange-600 uppercase tracking-wide">
              Cells Cleaned
            </div>
            <div className="text-2xl font-bold text-orange-800">
              {gameState.totalCleaned}
            </div>
          </div>
        </div>

        {/* Bonus Points Breakdown */}
        {gameState.score > gameState.totalCleaned * 10 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <div className="text-sm font-medium text-yellow-800 mb-2">
              🎁 Bonus Points Earned!
            </div>
            <div className="text-xs text-yellow-700">
              {gameState.cleanPercentage >= 100 && '• Perfect Clean Bonus'}
              {gameState.cleanPercentage >= 95 && gameState.cleanPercentage < 100 && '• Efficiency Bonus'}
              {level.timeLimit && gameState.timeElapsed < level.timeLimit && '• Time Remaining Bonus'}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          {!isLastLevel && (
            <button
              onClick={onNextLevel}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors transform hover:scale-105"
            >
              Next Level →
            </button>
          )}
          
          <button
            onClick={onRestartLevel}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Play Again
          </button>
          
          <button
            onClick={onMainMenu}
            className="w-full bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-6 rounded-lg transition-colors"
          >
            Main Menu
          </button>
        </div>

        {/* Final game message */}
        {isLastLevel && (
          <div className="mt-6 p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg">
            <h3 className="font-bold text-lg text-gray-800 mb-2">🏆 Congratulations!</h3>
            <p className="text-sm text-gray-700">
              You&apos;ve mastered all levels! You&apos;re a true Zamboni champion! 
              Try playing again to beat your scores.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
