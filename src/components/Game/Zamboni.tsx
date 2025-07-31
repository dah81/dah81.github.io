'use client';

import React from 'react';
import { ZamboniState } from '@/types/game';
import { COLORS } from '@/utils/constants';

interface ZamboniProps {
  zamboni: ZamboniState;
}

export function Zamboni({ zamboni }: ZamboniProps) {
  const size = 42; // MEGA ZAMBONI! Increased from 24px to 42px (+75% MEGA!)
  const { position, direction, isMoving, cleaningRadius } = zamboni;
  
  // Convert direction from radians to degrees for CSS transform
  const rotationDegrees = (direction * 180) / Math.PI;

  return (
    <g>
      {/* Enhanced cleaning radius indicator (when moving) - Shows WIDER cleaning path */}
      {isMoving && (
        <>
          {/* Outer cleaning radius - showing the wide cleaning path */}
          <circle
            cx={position.x}
            cy={position.y}
            r={cleaningRadius}
            fill="rgba(135, 206, 235, 0.15)" // Light blue cleaning area
            stroke="rgba(135, 206, 235, 0.6)"
            strokeWidth="2"
            strokeDasharray="4,2"
          />
          
          {/* Inner cleaning effect - showing the intense cleaning zone */}
          <circle
            cx={position.x}
            cy={position.y}
            r={cleaningRadius * 0.7}
            fill="rgba(135, 206, 235, 0.25)" // More intense cleaning
            stroke="rgba(135, 206, 235, 0.8)"
            strokeWidth="1"
            strokeDasharray="2,1"
          />
          
          {/* Cleaning blade effect - showing the professional cleaning equipment */}
          <circle
            cx={position.x}
            cy={position.y}
            r={cleaningRadius * 0.4}
            fill="rgba(255, 255, 255, 0.3)" // White cleaning blade effect
            stroke="rgba(255, 255, 255, 0.6)"
            strokeWidth="1"
          />
        </>
      )}
      
      {/* MEGA Zamboni body - Ultra Professional Design */}
      <g transform={`translate(${position.x}, ${position.y}) rotate(${rotationDegrees})`}>
        {/* Main chassis - Professional proportions */}
        <rect
          x={-size / 2}
          y={-size / 3}
          width={size}
          height={size * 2 / 3}
          fill={COLORS.ZAMBONI_BODY}
          stroke={COLORS.ZAMBONI_TRIM}
          strokeWidth="3"
          rx="4"
        />
        
        {/* Zamboni branding stripe */}
        <rect
          x={-size / 2 + 2}
          y={-size / 6}
          width={size - 4}
          height={4}
          fill={COLORS.ZAMBONI_TRIM}
          rx="2"
        />
        
        {/* Front blade assembly - Professional grade */}
        <rect
          x={size / 2 - 4}
          y={-size / 3}
          width={6}
          height={size * 2 / 3}
          fill="#C0C0C0"
          stroke="#A0A0A0"
          strokeWidth="2"
          rx="2"
        />
        
        {/* Ice scraper blade */}
        <rect
          x={size / 2 - 2}
          y={-size / 4}
          width={4}
          height={size / 2}
          fill="#8B5CF6"
          opacity="0.9"
          rx="1"
        />
        
        {/* Professional driver cab */}
        <rect
          x={-size / 2 + 4}
          y={-size / 3 + 2}
          width={size / 2}
          height={size / 2}
          fill="#4A5568"
          stroke="#2D3748"
          strokeWidth="2"
          rx="3"
        />
        
        {/* Windshield */}
        <rect
          x={-size / 2 + 6}
          y={-size / 3 + 4}
          width={size / 3}
          height={size / 4}
          fill="#87CEEB"
          opacity="0.8"
          stroke="#5A9FD4"
          strokeWidth="1"
          rx="2"
        />
        
        {/* Side windows */}
        <rect
          x={-size / 2 + 5}
          y={-size / 6}
          width={3}
          height={size / 6}
          fill="#87CEEB"
          opacity="0.7"
          rx="1"
        />
        <rect
          x={-size / 2 + 5}
          y={size / 12}
          width={3}
          height={size / 6}
          fill="#87CEEB"
          opacity="0.7"
          rx="1"
        />
        
        {/* Professional wheels - Heavy duty */}
        <circle
          cx={-size / 3}
          cy={-size / 3 + 3}
          r="5"
          fill="#2D3748"
          stroke="#1A202C"
          strokeWidth="2"
        />
        <circle
          cx={-size / 3}
          cy={size / 3 - 3}
          r="5"
          fill="#2D3748"
          stroke="#1A202C"
          strokeWidth="2"
        />
        <circle
          cx={size / 3}
          cy={-size / 3 + 3}
          r="5"
          fill="#2D3748"
          stroke="#1A202C"
          strokeWidth="2"
        />
        <circle
          cx={size / 3}
          cy={size / 3 - 3}
          r="5"
          fill="#2D3748"
          stroke="#1A202C"
          strokeWidth="2"
        />
        
        {/* Wheel hubs and rims */}
        <circle cx={-size / 3} cy={-size / 3 + 3} r="2" fill="#718096" stroke="#A0AEC0" strokeWidth="1" />
        <circle cx={-size / 3} cy={size / 3 - 3} r="2" fill="#718096" stroke="#A0AEC0" strokeWidth="1" />
        <circle cx={size / 3} cy={-size / 3 + 3} r="2" fill="#718096" stroke="#A0AEC0" strokeWidth="1" />
        <circle cx={size / 3} cy={size / 3 - 3} r="2" fill="#718096" stroke="#A0AEC0" strokeWidth="1" />
        
        {/* Tire treads */}
        <circle cx={-size / 3} cy={-size / 3 + 3} r="3" fill="none" stroke="#4A5568" strokeWidth="1" strokeDasharray="2,1" />
        <circle cx={-size / 3} cy={size / 3 - 3} r="3" fill="none" stroke="#4A5568" strokeWidth="1" strokeDasharray="2,1" />
        <circle cx={size / 3} cy={-size / 3 + 3} r="3" fill="none" stroke="#4A5568" strokeWidth="1" strokeDasharray="2,1" />
        <circle cx={size / 3} cy={size / 3 - 3} r="3" fill="none" stroke="#4A5568" strokeWidth="1" strokeDasharray="2,1" />
        

        
        {/* Enhanced movement trail effects */}
        {isMoving && (
          <>
            {/* Ice shavings */}
            <circle cx={-size / 2 - 8} cy={-4} r="2" fill="rgba(255, 255, 255, 0.8)" />
            <circle cx={-size / 2 - 14} cy={2} r="2" fill="rgba(255, 255, 255, 0.6)" />
            <circle cx={-size / 2 - 6} cy={4} r="2" fill="rgba(255, 255, 255, 0.7)" />
            <circle cx={-size / 2 - 12} cy={-2} r="1.5" fill="rgba(135, 206, 235, 0.9)" />
            <circle cx={-size / 2 - 18} cy={3} r="1.5" fill="rgba(135, 206, 235, 0.7)" />
            <circle cx={-size / 2 - 10} cy={1} r="1.5" fill="rgba(135, 206, 235, 0.8)" />
            
            {/* Steam effect */}
            <circle cx={-size / 2 - 5} cy={-6} r="1" fill="rgba(200, 200, 200, 0.6)" />
            <circle cx={-size / 2 - 8} cy={-8} r="1" fill="rgba(200, 200, 200, 0.4)" />
            <circle cx={-size / 2 - 3} cy={-7} r="1" fill="rgba(200, 200, 200, 0.5)" />
          </>
        )}
        
        {/* Professional exhaust pipe */}
        <rect
          x={-size / 2 + 2}
          y={-size / 2 + 2}
          width={3}
          height={6}
          fill="#2D3748"
          rx="1"
        />
        
        {/* Headlights */}
        <circle
          cx={size / 2 - 8}
          cy={-size / 4}
          r="2"
          fill="#FFFACD"
          opacity="0.9"
        />
        <circle
          cx={size / 2 - 8}
          cy={size / 4}
          r="2"
          fill="#FFFACD"
          opacity="0.9"
        />
      </g>
    </g>
  );
}
