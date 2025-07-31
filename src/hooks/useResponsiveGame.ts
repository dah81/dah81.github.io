'use client';

import { useState, useEffect } from 'react';

interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  scaleFactor: number;
  maxScale: number;
  minScale: number;
}

interface CameraState {
  x: number;
  y: number;
  scale: number;
  followZamboni: boolean;
}

export function useResponsiveGame() {
  const [viewport, setViewport] = useState<ViewportInfo>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile: false,
    isTablet: false,
    scaleFactor: 1,
    maxScale: 2,
    minScale: 0.2,
  });

  const [camera, setCamera] = useState<CameraState>({
    x: 0,
    y: 0,
    scale: 1,
    followZamboni: true,
  });

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      
      // Calculate scale factor based on viewport for COLOSSAL rinks
      let scaleFactor = 1;
      let maxScale = 2;
      let minScale = 0.1; // Very low minimum for colossal rinks
      
      if (isMobile) {
        // Scale to fit mobile screen with 20px padding on each side
        const availableWidth = width - 40;
        const availableHeight = height - 200; // Account for UI elements
        
        // Base scale on the largest rink size (COLOSSAL!)
        const maxRinkWidth = 2000; // Updated for COLOSSAL ultimate rink
        const maxRinkHeight = 800; // Updated for COLOSSAL ultimate rink
        
        const widthScale = availableWidth / maxRinkWidth;
        const heightScale = availableHeight / maxRinkHeight;
        
        scaleFactor = Math.min(widthScale, heightScale, 1);
        scaleFactor = Math.max(scaleFactor, 0.15); // Lower minimum for colossal rinks
        maxScale = 1.5; // Mobile max zoom
        minScale = 0.1; // Mobile min zoom for colossal rinks
      } else if (isTablet) {
        // Moderate scaling for tablets
        const availableWidth = width - 100;
        const availableHeight = height - 150;
        
        const maxRinkWidth = 2000; // Updated for COLOSSAL ultimate rink
        const maxRinkHeight = 800; // Updated for COLOSSAL ultimate rink
        
        const widthScale = availableWidth / maxRinkWidth;
        const heightScale = availableHeight / maxRinkHeight;
        
        scaleFactor = Math.min(widthScale, heightScale, 1);
        scaleFactor = Math.max(scaleFactor, 0.2); // Lower minimum for colossal rinks
        maxScale = 2; // Tablet max zoom
        minScale = 0.15; // Tablet min zoom
      } else {
        // Desktop - can handle larger scales
        maxScale = 3;
        minScale = 0.2;
      }
      
      setViewport({
        width,
        height,
        isMobile,
        isTablet,
        scaleFactor,
        maxScale,
        minScale,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Camera controls for mobile navigation
  const updateCamera = (newCamera: Partial<CameraState>) => {
    setCamera(prev => ({ ...prev, ...newCamera }));
  };

  const centerOnZamboni = (zamboniX: number, zamboniY: number) => {
    if (camera.followZamboni) {
      setCamera(prev => ({
        ...prev,
        x: zamboniX,
        y: zamboniY,
      }));
    }
  };

  const zoomCamera = (deltaScale: number, centerX?: number, centerY?: number) => {
    setCamera(prev => {
      const newScale = Math.max(viewport.minScale, Math.min(viewport.maxScale, prev.scale + deltaScale));
      
      // If zoom center is provided, adjust camera position
      let newX = prev.x;
      let newY = prev.y;
      
      if (centerX !== undefined && centerY !== undefined) {
        const scaleRatio = newScale / prev.scale;
        newX = centerX - (centerX - prev.x) * scaleRatio;
        newY = centerY - (centerY - prev.y) * scaleRatio;
      }
      
      return {
        ...prev,
        scale: newScale,
        x: newX,
        y: newY,
        followZamboni: false, // Disable follow when manually zooming
      };
    });
  };

  const panCamera = (deltaX: number, deltaY: number) => {
    setCamera(prev => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY,
      followZamboni: false, // Disable follow when manually panning
    }));
  };

  const resetCamera = () => {
    setCamera({
      x: 0,
      y: 0,
      scale: viewport.scaleFactor,
      followZamboni: true,
    });
  };

  return {
    viewport,
    camera,
    updateCamera,
    centerOnZamboni,
    zoomCamera,
    panCamera,
    resetCamera,
  };
}
