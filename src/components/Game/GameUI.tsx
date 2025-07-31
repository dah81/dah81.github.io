'use client';

import React from 'react';
import { GameState, GameLevel } from '@/types/game';
import { COLORS } from '@/utils/constants';

interface GameUIProps {
  gameState: GameState;
  level: GameLevel;
  onPause: () => void;
  onRestart: () => void;
}

export function GameUI({ gameState, level, onPause, onRestart }: GameUIProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeRemaining = (): string | null => {
    if (!level.timeLimit) return null;
    const remaining = Math.max(0, level.timeLimit - gameState.timeElapsed);
    return formatTime(remaining);
  };

  const progressPercentage = (gameState.cleanPercentage / level.targetCleanPercentage) * 100;
  const isProgressComplete = progressPercentage >= 100;

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-4 space-y-4">
      {/* Level Info */}
      <div className="text-center">
        <h2 className="text-lg md:text-xl font-bold text-gray-800">{level.name}</h2>
        <div className="text-xs md:text-sm text-gray-600">
          Level {level.id} - Target: {level.targetCleanPercentage}% Clean
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm font-medium text-gray-700">
          <span>Progress</span>
          <span>{gameState.cleanPercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-300 ${
              isProgressComplete ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ 
              width: `${Math.min(100, progressPercentage)}%`,
              backgroundColor: isProgressComplete ? COLORS.UI_SUCCESS : COLORS.UI_PRIMARY 
            }}
          />
        </div>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-2 lg:grid-cols-2 gap-2 md:gap-4 text-sm">
        <div className="bg-gray-50 rounded p-2">
          <div className="font-medium text-gray-600 text-xs md:text-sm">Score</div>
          <div className="text-base md:text-lg font-bold text-gray-800">
            {gameState.score.toLocaleString()}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded p-2">
          <div className="font-medium text-gray-600 text-xs md:text-sm">Time</div>
          <div className="text-base md:text-lg font-bold text-gray-800">
            {formatTime(gameState.timeElapsed)}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded p-2">
          <div className="font-medium text-gray-600 text-xs md:text-sm">Cleaned</div>
          <div className="text-base md:text-lg font-bold text-gray-800">
            {gameState.totalCleaned}
          </div>
        </div>
        
        <div className="bg-gray-50 rounded p-2">
          <div className="font-medium text-gray-600 text-xs md:text-sm">
            {level.timeLimit ? 'Time Left' : 'Status'}
          </div>
          <div className={`text-base md:text-lg font-bold ${
            getTimeRemaining() && parseInt(getTimeRemaining()!.split(':')[0]) === 0 && 
            parseInt(getTimeRemaining()!.split(':')[1]) < 30 ? 'text-red-600' : 'text-gray-800'
          }`}>
            {getTimeRemaining() || (isProgressComplete ? '✓ Complete' : 'In Progress')}
          </div>
        </div>
      </div>

      {/* Control Buttons - Hidden on mobile (replaced by floating buttons) */}
      <div className="hidden md:flex gap-2">
        <button
          onClick={onPause}
          className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          {gameState.isPaused ? 'Resume' : 'Pause'}
        </button>
        
        <button
          onClick={onRestart}
          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded transition-colors"
        >
          Restart
        </button>
      </div>

      {/* Controls Help - Responsive */}
      <div className="text-xs text-gray-500 text-center space-y-1">
        <div className="hidden md:block">Use WASD or Arrow Keys to move</div>
        <div className="md:hidden">Use virtual joystick to move</div>
        <div className="hidden md:block">Space/P to pause • Stay moving to clean!</div>
        <div className="md:hidden">Use floating buttons to pause/restart</div>
      </div>
    </div>
  );
}
