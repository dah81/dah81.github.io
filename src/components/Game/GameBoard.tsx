'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { GameState, GameLevel, GameStatus } from '@/types/game';
import { IceRink } from './IceRink';
import { Zamboni } from './Zamboni';
import { GameUI } from './GameUI';
import { TouchControls, MobileControls, PinchZoomContainer } from './TouchControls';
import { useResponsiveGame } from '@/hooks/useResponsiveGame';
import { CONTROLS } from '@/utils/constants';

interface GameBoardProps {
  gameState: GameState;
  level: GameLevel;
  gameStatus: GameStatus;
  onZamboniMovement: (direction: number, isMoving: boolean) => void;
  onPause: () => void;
  onRestart: () => void;
}

export function GameBoard({ 
  gameState, 
  level, 
  gameStatus, 
  onZamboniMovement, 
  onPause, 
  onRestart 
}: GameBoardProps) {
  const keysPressed = React.useRef(new Set<string>());
  const responsiveGame = useResponsiveGame();
  
  // Camera state for mobile navigation
  const [cameraState, setCameraState] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Handle keyboard input
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (gameStatus !== GameStatus.PLAYING) return;

    const key = event.code;
    keysPressed.current.add(key);

    // Pause controls
    if (CONTROLS.PAUSE.includes(key)) {
      event.preventDefault();
      onPause();
      return;
    }

    // Calculate movement direction based on pressed keys
    let directionX = 0;
    let directionY = 0;

    if (CONTROLS.LEFT.some(k => keysPressed.current.has(k))) directionX -= 1;
    if (CONTROLS.RIGHT.some(k => keysPressed.current.has(k))) directionX += 1;
    if (CONTROLS.UP.some(k => keysPressed.current.has(k))) directionY -= 1;
    if (CONTROLS.DOWN.some(k => keysPressed.current.has(k))) directionY += 1;

    if (directionX !== 0 || directionY !== 0) {
      const direction = Math.atan2(directionY, directionX);
      onZamboniMovement(direction, true);
      event.preventDefault();
    }
  }, [gameStatus, onZamboniMovement, onPause]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (gameStatus !== GameStatus.PLAYING) return;

    const key = event.code;
    keysPressed.current.delete(key);

    // Check if any movement keys are still pressed
    const hasMovementKeys = 
      CONTROLS.UP.some(k => keysPressed.current.has(k)) ||
      CONTROLS.DOWN.some(k => keysPressed.current.has(k)) ||
      CONTROLS.LEFT.some(k => keysPressed.current.has(k)) ||
      CONTROLS.RIGHT.some(k => keysPressed.current.has(k));

    if (!hasMovementKeys) {
      onZamboniMovement(0, false);
    } else {
      // Recalculate direction with remaining keys
      let directionX = 0;
      let directionY = 0;

      if (CONTROLS.LEFT.some(k => keysPressed.current.has(k))) directionX -= 1;
      if (CONTROLS.RIGHT.some(k => keysPressed.current.has(k))) directionX += 1;
      if (CONTROLS.UP.some(k => keysPressed.current.has(k))) directionY -= 1;
      if (CONTROLS.DOWN.some(k => keysPressed.current.has(k))) directionY += 1;

      const direction = Math.atan2(directionY, directionX);
      onZamboniMovement(direction, true);
    }
  }, [gameStatus, onZamboniMovement]);

  // Camera control handlers
  const handleZoom = useCallback((scaleChange: number) => {
    setCameraState(prev => {
      const newScale = Math.max(0.3, Math.min(2.0, prev.scale + scaleChange));
      return { ...prev, scale: newScale };
    });
  }, []);

  const handlePan = useCallback((deltaX: number, deltaY: number) => {
    setCameraState(prev => ({
      ...prev,
      offsetX: prev.offsetX + deltaX,
      offsetY: prev.offsetY + deltaY,
    }));
  }, []);

  const handleZoomIn = useCallback(() => {
    setCameraState(prev => ({
      ...prev,
      scale: Math.min(2.0, prev.scale + 0.2),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setCameraState(prev => ({
      ...prev,
      scale: Math.max(0.3, prev.scale - 0.2),
    }));
  }, []);

  const handleCenterCamera = useCallback(() => {
    // Center on zamboni using correct property path
    const zamboniCenterX = gameState.zamboni.position.x + 21; // Half of zamboni width (42px)
    const zamboniCenterY = gameState.zamboni.position.y + 21; // Half of zamboni height (42px)
    
    setCameraState({
      scale: responsiveGame.viewport.isMobile ? 0.8 : 1.0,
      offsetX: -zamboniCenterX + (responsiveGame.viewport.width / 2),
      offsetY: -zamboniCenterY + (responsiveGame.viewport.height / 2),
    });
  }, [gameState.zamboni, responsiveGame.viewport]);

  // Set up keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Clear keys when game is paused or stopped
  useEffect(() => {
    if (gameStatus !== GameStatus.PLAYING) {
      keysPressed.current.clear();
      onZamboniMovement(0, false);
    }
  }, [gameStatus, onZamboniMovement]);

  // Auto-center camera on zamboni initially for mobile
  useEffect(() => {
    if (responsiveGame.viewport.isMobile && gameStatus === GameStatus.PLAYING) {
      handleCenterCamera();
    }
  }, [responsiveGame.viewport.isMobile, gameStatus, handleCenterCamera]);

  const gameAreaStyle = responsiveGame.viewport.isMobile ? {
    transform: `translate(${cameraState.offsetX}px, ${cameraState.offsetY}px) scale(${cameraState.scale})`,
    transformOrigin: '0 0',
  } : {
    transform: `scale(${responsiveGame.viewport.scaleFactor})`,
    transformOrigin: 'center center',
  };

  const GameContent = (
    <div className="flex flex-col lg:flex-row gap-6 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 min-h-screen">
      {/* Game Area */}
      <div className={`flex-1 flex items-center justify-center ${responsiveGame.viewport.isMobile ? 'overflow-hidden' : ''}`}>
        <div 
          className="relative rounded-lg shadow-lg"
          style={gameAreaStyle}
        >
          {/* Ice Rink */}
          <IceRink level={level} iceGrid={gameState.iceGrid} />
          
          {/* Zamboni overlay */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ 
              width: level.rinkSize.width, 
              height: level.rinkSize.height 
            }}
          >
            <Zamboni zamboni={gameState.zamboni} />
          </svg>

          {/* Pause overlay */}
          {gameStatus === GameStatus.PAUSED && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Game Paused</h2>
                <p className="text-gray-600 mb-4">Press Resume to continue</p>
                <button
                  onClick={onPause}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-6 rounded transition-colors"
                >
                  Resume
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* UI Panel - Responsive */}
      <div className={`${responsiveGame.viewport.isMobile ? 'w-full' : 'lg:w-80'}`}>
        <GameUI
          gameState={gameState}
          level={level}
          onPause={onPause}
          onRestart={onRestart}
        />
      </div>

      {/* Mobile Touch Controls */}
      <TouchControls
        onMovement={onZamboniMovement}
        isActive={gameStatus === GameStatus.PLAYING}
      />

      {/* Mobile Control Buttons */}
      <MobileControls
        onPause={onPause}
        onRestart={onRestart}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onCenterCamera={handleCenterCamera}
        isPaused={gameStatus === GameStatus.PAUSED}
      />
    </div>
  );

  // Wrap with pinch-zoom container for mobile
  if (responsiveGame.viewport.isMobile) {
    return (
      <PinchZoomContainer
        onZoom={handleZoom}
        onPan={handlePan}
        currentScale={cameraState.scale}
      >
        {GameContent}
      </PinchZoomContainer>
    );
  }

  return GameContent;
}
