'use client';

import { useEffect, useRef, useCallback } from 'react';

export function useGameLoop(
  gameTick: (deltaTime: number) => void,
  isActive: boolean = true
) {
  const requestRef = useRef<number | undefined>(undefined);
  const previousTimeRef = useRef<number | undefined>(undefined);
  
  // 🚀 BUTTER-SMOOTH MOVEMENT: Removed FPS throttling for unlimited smoothness!
  // No more targetFPS restrictions - let the zamboni move as smooth as possible!

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      
      // 🚀 ALWAYS UPDATE: No FPS throttling - maximum smoothness!
      // Convert to seconds and call game tick every frame
      gameTick(deltaTime / 1000);
      previousTimeRef.current = time;
    } else {
      previousTimeRef.current = time;
    }
    
    if (isActive) {
      requestRef.current = requestAnimationFrame(animate);
    }
  }, [gameTick, isActive]);

  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
    
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate, isActive]);

  return {
    start: () => {
      if (!isActive && !requestRef.current) {
        requestRef.current = requestAnimationFrame(animate);
      }
    },
    stop: () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
      }
    }
  };
}
