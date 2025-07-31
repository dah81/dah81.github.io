'use client';

import React from 'react';
import { GameLevel, IceCell } from '@/types/game';
import { COLORS, GAME_CONFIG } from '@/utils/constants';
import { getIceCellColor } from '@/utils/gameLogic';

interface IceRinkProps {
  level: GameLevel;
  iceGrid: IceCell[][];
}

export function IceRink({ level, iceGrid }: IceRinkProps) {
  const rinkWidth = level.rinkSize.width;
  const rinkHeight = level.rinkSize.height;
  
  // 🏒 ROUNDED CORNERS! Match corner radius to zamboni's cleaning radius for perfect fit
  const cornerRadius = level.cleaningRadius; // Perfect match for seamless corner cleaning!

  return (
    <div className="relative bg-white" style={{ borderRadius: cornerRadius }}>
      <svg
        width={rinkWidth}
        height={rinkHeight}
        className="block"
        style={{ backgroundColor: COLORS.ICE_CLEAN }}
      >
        {/* 🏟️ Professional Rounded Rink Background with matching corner radius */}
        <rect
          x={0}
          y={0}
          width={rinkWidth}
          height={rinkHeight}
          fill={COLORS.ICE_CLEAN}
          rx={cornerRadius}
          ry={cornerRadius}
        />
        
        {/* 🏒 Professional Rink Boards with rounded corners */}
        <rect
          x={0}
          y={0}
          width={rinkWidth}
          height={rinkHeight}
          fill="none"
          stroke="#2D3748" // Professional rink board color
          strokeWidth="6"
          rx={cornerRadius}
          ry={cornerRadius}
        />
        
        {/* Enhanced inner board detail */}
        <rect
          x={2}
          y={2}
          width={rinkWidth - 4}
          height={rinkHeight - 4}
          fill="none"
          stroke="#4A5568" // Lighter inner board
          strokeWidth="2"
          rx={cornerRadius - 2}
          ry={cornerRadius - 2}
        />

        {/* Hockey rink markings */}
        <HockeyRinkMarkings width={rinkWidth} height={rinkHeight} cornerRadius={cornerRadius} />
        
        {/* Ice cells with rounded clipping path */}
        <defs>
          <clipPath id={`rink-clip-${level.id}`}>
            <rect
              x={0}
              y={0}
              width={rinkWidth}
              height={rinkHeight}
              rx={cornerRadius}
              ry={cornerRadius}
            />
          </clipPath>
        </defs>
        
        <g clipPath={`url(#rink-clip-${level.id})`}>
          {iceGrid.map((row, y) =>
            row.map((cell, x) => (
              <rect
                key={`${x}-${y}`}
                x={x * GAME_CONFIG.GRID_SIZE}
                y={y * GAME_CONFIG.GRID_SIZE}
                width={GAME_CONFIG.GRID_SIZE}
                height={GAME_CONFIG.GRID_SIZE}
                fill={getIceCellColor(cell)}
                opacity={cell.isDirty ? 0.8 : 0}
              />
            ))
          )}
        </g>
      </svg>
    </div>
  );
}

interface HockeyRinkMarkingsProps {
  width: number;
  height: number;
  cornerRadius: number;
}

function HockeyRinkMarkings({ width, height, cornerRadius }: HockeyRinkMarkingsProps) {
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Simplified hockey rink specifications:
  const goal1X = width * 0.05;    // Goal at 5%
  const goal2X = width * 0.95;    // Goal at 95%  
  const blueLine1X = width * 0.25; // Blue line at 25%
  const blueLine2X = width * 0.75; // Blue line at 75%
  const centerLineX = width * 0.50; // Center line at 50%
  const faceOffRadius = Math.min(width, height) * 0.08;

  return (
    <g>
      {/* 🥅 Goals at 5% and 95% */}
      <rect
        x={goal1X - 3}
        y={centerY - 12}
        width={6}
        height={24}
        fill={COLORS.RINK_LINES}
        rx={2}
      />
      <rect
        x={goal2X - 3}
        y={centerY - 12}
        width={6}
        height={24}
        fill={COLORS.RINK_LINES}
        rx={2}
      />
      
      {/* Goal creases (semi-circles) */}
      <path
        d={`M ${goal1X} ${centerY - 15} A 15 15 0 0 1 ${goal1X} ${centerY + 15}`}
        fill="none"
        stroke={COLORS.RINK_CIRCLES}
        strokeWidth="2"
      />
      <path
        d={`M ${goal2X} ${centerY - 15} A 15 15 0 0 0 ${goal2X} ${centerY + 15}`}
        fill="none"
        stroke={COLORS.RINK_CIRCLES}
        strokeWidth="2"
      />

      {/* 🔵 Blue lines at 25% and 75% */}
      <line
        x1={blueLine1X}
        y1={cornerRadius}
        x2={blueLine1X}
        y2={height - cornerRadius}
        stroke={COLORS.RINK_CIRCLES}
        strokeWidth="3"
      />
      <line
        x1={blueLine2X}
        y1={cornerRadius}
        x2={blueLine2X}
        y2={height - cornerRadius}
        stroke={COLORS.RINK_CIRCLES}
        strokeWidth="3"
      />
      
      {/* 🔴 Center line at 50% */}
      <line
        x1={centerLineX}
        y1={cornerRadius}
        x2={centerLineX}
        y2={height - cornerRadius}
        stroke={COLORS.RINK_LINES}
        strokeWidth="2"
      />
      
      {/* 🔴 Center face-off dot */}
      <circle
        cx={centerX}
        cy={centerY}
        r={4}
        fill={COLORS.RINK_LINES}
      />
      
      {/* Center face-off circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={faceOffRadius}
        fill="none"
        stroke={COLORS.RINK_CIRCLES}
        strokeWidth="2"
      />
    </g>
  );
}
