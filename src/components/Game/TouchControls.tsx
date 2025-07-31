'use client';

import React, { useRef, useCallback } from 'react';

interface TouchControlsProps {
  onMovement: (direction: number, isMoving: boolean) => void;
  isActive: boolean;
}

export function TouchControls({ onMovement, isActive }: TouchControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const centerPoint = useRef({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isActive || !joystickRef.current || !knobRef.current) return;
    
    e.preventDefault();
    isDragging.current = true;
    
    const rect = joystickRef.current.getBoundingClientRect();
    centerPoint.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, [isActive]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current || !knobRef.current || !isActive) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    const deltaX = touch.clientX - centerPoint.current.x;
    const deltaY = touch.clientY - centerPoint.current.y;
    
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = 50; // Increased for better control
    
    if (distance > 8) { // Larger dead zone for better control
      // Calculate direction
      const direction = Math.atan2(deltaY, deltaX);
      
      // Limit knob position
      const limitedDistance = Math.min(distance, maxDistance);
      const knobX = Math.cos(direction) * limitedDistance;
      const knobY = Math.sin(direction) * limitedDistance;
      
      // Update knob position
      knobRef.current.style.transform = `translate(${knobX}px, ${knobY}px)`;
      
      // Send movement command
      onMovement(direction, true);
    } else {
      // In dead zone, stop movement
      knobRef.current.style.transform = 'translate(0px, 0px)';
      onMovement(0, false);
    }
  }, [isActive, onMovement]);

  const handleTouchEnd = useCallback(() => {
    if (!knobRef.current) return;
    
    isDragging.current = false;
    knobRef.current.style.transform = 'translate(0px, 0px)';
    onMovement(0, false);

    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }, [onMovement]);

  return (
    <div className="fixed bottom-6 left-6 md:hidden z-50">
      <div 
        ref={joystickRef}
        className="w-24 h-24 bg-white/25 backdrop-blur-sm border-3 border-white/40 rounded-full flex items-center justify-center touch-joystick shadow-lg"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          ref={knobRef}
          className="w-12 h-12 bg-white/80 rounded-full transition-transform duration-100 shadow-md border-2 border-white/60"
          style={{ transform: 'translate(0px, 0px)' }}
        />
      </div>
      
      {/* Enhanced instructions */}
      <div className="text-white/80 text-xs text-center mt-2 font-medium">
        🕹️ Virtual Joystick
      </div>
    </div>
  );
}

interface MobileControlsProps {
  onPause: () => void;
  onRestart: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onCenterCamera: () => void;
  isPaused: boolean;
}

export function MobileControls({ 
  onPause, 
  onRestart, 
  onZoomIn, 
  onZoomOut, 
  onCenterCamera, 
  isPaused 
}: MobileControlsProps) {
  return (
    <div className="fixed bottom-6 right-6 md:hidden flex flex-col gap-3 z-50">
      {/* Camera Controls */}
      <div className="flex flex-row gap-2">
        <button
          onClick={onZoomIn}
          className="w-12 h-12 bg-blue-500/90 hover:bg-blue-600/90 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg"
        >
          ➕
        </button>
        
        <button
          onClick={onZoomOut}
          className="w-12 h-12 bg-blue-500/90 hover:bg-blue-600/90 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg"
        >
          ➖
        </button>
      </div>
      
      <button
        onClick={onCenterCamera}
        className="w-12 h-12 bg-purple-500/90 hover:bg-purple-600/90 text-white rounded-full flex items-center justify-center text-lg shadow-lg"
      >
        🎯
      </button>
      
      {/* Game Controls */}
      <button
        onClick={onPause}
        className="w-12 h-12 bg-yellow-500/90 hover:bg-yellow-600/90 text-white rounded-full flex items-center justify-center text-lg font-bold shadow-lg"
      >
        {isPaused ? '▶️' : '⏸️'}
      </button>
      
      <button
        onClick={onRestart}
        className="w-12 h-12 bg-gray-500/90 hover:bg-gray-600/90 text-white rounded-full flex items-center justify-center text-lg shadow-lg"
      >
        🔄
      </button>
    </div>
  );
}

interface PinchZoomProps {
  children: React.ReactNode;
  onZoom: (scale: number) => void;
  onPan: (deltaX: number, deltaY: number) => void;
  currentScale: number;
}

export function PinchZoomContainer({ 
  children, 
  onZoom, 
  onPan, 
  currentScale,
}: PinchZoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number>(0);
  const lastTouchCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPinching = useRef(false);
  const lastPanPoint = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getTouchCenter = (touches: React.TouchList) => {
    if (touches.length < 2) return { x: 0, y: 0 };
    const touch1 = touches[0];
    const touch2 = touches[1];
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Start pinch gesture
      isPinching.current = true;
      lastTouchDistance.current = getTouchDistance(e.touches);
      lastTouchCenter.current = getTouchCenter(e.touches);
      e.preventDefault();
    } else if (e.touches.length === 1) {
      // Start pan gesture
      isPinching.current = false;
      lastPanPoint.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && isPinching.current) {
      // Handle pinch zoom
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const currentCenter = getTouchCenter(e.touches);
      
      if (lastTouchDistance.current > 0) {
        const scaleChange = (currentDistance - lastTouchDistance.current) * 0.01;
        onZoom(scaleChange);
      }
      
      lastTouchDistance.current = currentDistance;
      lastTouchCenter.current = currentCenter;
    } else if (e.touches.length === 1 && !isPinching.current) {
      // Handle pan
      const currentPoint = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
      
      const deltaX = currentPoint.x - lastPanPoint.current.x;
      const deltaY = currentPoint.y - lastPanPoint.current.y;
      
      // Only pan if movement is significant and not on joystick
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        onPan(deltaX / currentScale, deltaY / currentScale);
      }
      
      lastPanPoint.current = currentPoint;
    }
  }, [onZoom, onPan, currentScale]);

  const handleTouchEnd = useCallback(() => {
    isPinching.current = false;
    lastTouchDistance.current = 0;
  }, []);

  return (
    <div
      ref={containerRef}
      className="touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}
