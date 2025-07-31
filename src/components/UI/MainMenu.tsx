'use client';

import React from 'react';
import { GAME_LEVELS } from '@/utils/constants';

interface MainMenuProps {
  onStartGame: (levelIndex: number) => void;
}

export function MainMenu({ onStartGame }: MainMenuProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-cyan-800 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
        {/* Game Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">
            🏒 Zamboni Master
          </h1>
          <p className="text-lg md:text-xl text-gray-600">
            Clean the ice, master the rink!
          </p>
          <p className="text-sm text-blue-600 font-medium mt-1">
            ⚡ Epic Scale Update: Massive Rinks & Giant Zamboni! ⚡
          </p>
        </div>

        {/* Game Description */}
        <div className="bg-blue-50 rounded-lg p-4 md:p-6 mb-6">
          <h2 className="text-base md:text-lg font-semibold text-gray-800 mb-3">How to Play:</h2>
          <ul className="text-gray-700 space-y-2 text-sm md:text-base">
            <li className="hidden md:block">🎮 Use <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">WASD</kbd> or <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Arrow Keys</kbd> to drive the zamboni</li>
            <li className="md:hidden">🎮 Use the virtual joystick to drive the zamboni</li>
            <li>🧹 Drive over dirty ice to clean it automatically</li>
            <li>🎯 Reach the target clean percentage to complete each level</li>
            <li>⏱️ Some levels have time limits - work fast!</li>
            <li className="hidden md:block">⏸️ Press <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">Space</kbd> or <kbd className="px-2 py-1 bg-gray-200 rounded text-sm">P</kbd> to pause</li>
            <li className="md:hidden">⏸️ Use floating buttons to pause and restart</li>
          </ul>
        </div>

        {/* Level Selection */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800 text-center">
            Select Level
          </h2>
          
          <div className="grid gap-3">
            {GAME_LEVELS.map((level, index) => (
              <button
                key={level.id}
                onClick={() => onStartGame(index)}
                className="group bg-white hover:bg-blue-50 border-2 border-gray-200 hover:border-blue-300 rounded-xl p-4 text-left transition-all duration-200 transform hover:scale-[1.02]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base md:text-lg text-gray-800 group-hover:text-blue-700">
                      Level {level.id}: {level.name}
                    </h3>
                    <div className="text-xs md:text-sm text-gray-600 mt-1">
                      <span className="inline-block mr-4">
                        🎯 Target: {level.targetCleanPercentage}% clean
                      </span>
                      {level.timeLimit && (
                        <span className="inline-block">
                          ⏱️ Time limit: {Math.floor(level.timeLimit / 60)}:{(level.timeLimit % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 hidden md:block">
                      Rink: {level.rinkSize.width}×{level.rinkSize.height} • 
                      Speed: {level.zamboniSpeed}x • 
                      Cleaning: {level.cleaningRadius}px radius
                    </div>
                  </div>
                  <div className="text-3xl opacity-70 group-hover:opacity-100 transition-opacity">
                    {index === 0 ? '🥅' : index === 1 ? '🏒' : index === 2 ? '🏆' : '⚡'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          Built with Next.js • Idle game mechanics • Multiple levels
        </div>
      </div>
    </div>
  );
}
