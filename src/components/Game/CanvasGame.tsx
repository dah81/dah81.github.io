"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { paths } from "@/utils/paths";
// import { useRouter } from "next/navigation"; // router not needed after removing auto-return
import { createGame, integrate, fromInputDrag } from "@/utils/gameLogic";
import { LEVELS, findLevel } from "@/utils/levels";
import { PALETTE } from "@/utils/constants";
import { markComplete, getBestTime, setBestTime, getProgress } from "@/utils/progress";
import { updateHighScores } from "@/utils/highScores";
import type { GameState, Level } from "@/types/game";
import { noSmooth, snapPoint } from "@/utils/pixel";
import { PIXEL_PALETTE, createDitherPattern } from "@/utils/palette";

// Local types for effects
type FXParticle = { x: number; y: number; vx: number; vy: number; life: number; max: number };
type FXTrailPoint = { x: number; y: number; t: number };

const useRaf = (cb: () => void) => {
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      cb();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cb]);
};

interface Props {
  levelId: string;
}

export default function CanvasGame({ levelId }: Props) {
  // const router = useRouter(); // unused (kept comment for potential future nav)
  const level = useMemo<Level>(() => structuredClone(findLevel(levelId)), [levelId]);
  const [state, setState] = useState<GameState>(() => createGame(level));
  const [completed, setCompleted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Backbuffer for pixel-perfect rendering
  const backbufferRef = useRef<HTMLCanvasElement | null>(null);
  const BB_W = 320; // 16-bit vibe base width
  const BB_H = 180; // matches 16:9 levels; adjust if aspect changes
  const nextBtnRef = useRef<HTMLAnchorElement | null>(null);
  const menuBtnRef = useRef<HTMLAnchorElement | null>(null);
  // Keyboard state
  const keysRef = useRef<Set<string>>(new Set());
  const spaceDownRef = useRef(false);
  const prevSpaceDownRef = useRef(false);
  // 8-direction sprite frames for Zamboni
  const zFramesRef = useRef<HTMLCanvasElement[][] | null>(null);
  // Effects: particles and trail
  const particlesRef = useRef<FXParticle[]>([]);
  const trailRef = useRef<FXTrailPoint[]>([]);
  const [effectsOn, setEffectsOn] = useState(true);
  // Celebration
  type Confetti = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    max: number;
  };
  const confettiRef = useRef<Confetti[]>([]);
  const completedAtRef = useRef<number | null>(null);
  const [grade, setGrade] = useState<string | null>(null);
  const [parTime, setParTime] = useState<number | null>(null);
  const [bestTime, setBestTimeState] = useState<number | null>(null);
  // Final summary (filled only when last level completed)
  const [finalSummary, setFinalSummary] = useState<
    { id: string; name: string; best: number | null; completed: boolean }[]
  >([]);
  const initialDirtAvgRef = useRef<number>(0);
  const isFinalLevel = useMemo(() => LEVELS[LEVELS.length - 1]?.id === levelId, [levelId]);

  // Build summary after completing final level
  useEffect(() => {
    if (!(completed && isFinalLevel)) return;
    try {
      const progress = getProgress();
      const rows = LEVELS.map((l) => ({
        id: l.id,
        name: l.name,
        best: getBestTime(l.id),
        completed: progress.completed.has(l.id),
      }));
      setFinalSummary(rows);
    } catch {}
  }, [completed, isFinalLevel]);

  // Record initial dirt level when level changes
  // We intentionally compute this only when the level id changes, not on every dirt mutation during play
  useEffect(() => {
    initialDirtAvgRef.current = computeGridAvg(state.level.dirt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.level.id]);

  // Responsive sizing: fill viewport while preserving aspect ratio.
  const [size, setSize] = useState(() => ({ w: 640, h: 360 }));
  useEffect(() => {
    function computeSize() {
      if (typeof window === "undefined") return;
      const aspect = level.rink.width / level.rink.height;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const hud = 48; // reserve space for HUD text
      const availableH = Math.max(120, vh - hud);
      // Account for outer container horizontal padding (px-2 => ~16px) to avoid overflow
      const outerPad = 16; // keep in sync with parent px-2
      let w = Math.max(160, vw - outerPad);
      let h = w / aspect;
      // Guard: if height would exceed available viewport height, clamp by height
      if (h > availableH) {
        h = availableH;
        w = h * aspect;
      }
      setSize({ w: Math.round(w), h: Math.round(h) });
    }
    computeSize();
    window.addEventListener("resize", computeSize);
    return () => window.removeEventListener("resize", computeSize);
  }, [level.rink.width, level.rink.height]);

  // Build Zamboni sprite frames once on mount (8 directions x 2 animation frames)
  useEffect(() => {
    const len = state.z.length;
    const wid = state.z.width;
    zFramesRef.current = buildZamboniSprites(len, wid, 2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load/save effects toggle
  useEffect(() => {
    try {
      const v = localStorage.getItem("zamboni.effects.v1");
      if (v !== null) setEffectsOn(v === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("zamboni.effects.v1", effectsOn ? "1" : "0");
    } catch {}
  }, [effectsOn]);

  // Input state via touch/mouse drag
  const drag = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
  } | null>(null);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const getPos = (e: Touch | MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = "clientX" in e ? (e as MouseEvent).clientX : (e as Touch).clientX;
      const y = "clientY" in e ? (e as MouseEvent).clientY : (e as Touch).clientY;
      return { x: x - rect.left, y: y - rect.top };
    };

    const start = (e: TouchEvent | MouseEvent) => {
      const p = "touches" in e ? getPos(e.touches[0]) : getPos(e as MouseEvent);
      const t = performance.now();
      drag.current = {
        active: true,
        startX: p.x,
        startY: p.y,
        lastX: p.x,
        lastY: p.y,
        lastTime: t,
      };
      setState((s) => ({ ...s, input: { ...s.input, active: true } }));
    };

    const move = (e: TouchEvent | MouseEvent) => {
      if (!drag.current) return;
      const p = "touches" in e ? getPos(e.touches[0]) : getPos(e as MouseEvent);
      const dx = p.x - drag.current.startX;
      const dy = p.y - drag.current.startY;
      const out = fromInputDrag(dx, dy);
      setState((s) => ({
        ...s,
        input: { ...s.input, dir: { x: out.dir.x, y: out.dir.y }, strength: out.strength },
      }));
      drag.current.lastX = p.x;
      drag.current.lastY = p.y;
      drag.current.lastTime = performance.now();
    };

    const end = (e: TouchEvent | MouseEvent) => {
      if (!drag.current) return;
      // mark event used for linting without changing logic
      if ("preventDefault" in e) {
        // no-op
      }
      const dt = Math.max(1, performance.now() - drag.current.lastTime);
      const vx = (drag.current.lastX - drag.current.startX) / dt;
      const vy = (drag.current.lastY - drag.current.startY) / dt;
      const v = Math.hypot(vx, vy);
      // Flick threshold
      const isFlick = v > 0.8;
      setState((s) => ({
        ...s,
        input: {
          ...s.input,
          active: false,
          strength: 0,
          boostTicks: isFlick ? s.input.boostTicks + 15 : s.input.boostTicks,
        },
      }));
      drag.current = null;
    };

    el.addEventListener("touchstart", start, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchend", end);
    const onMouseDown = (ev: MouseEvent) => start(ev);
    const onMouseMove = (ev: MouseEvent) => move(ev);
    const onMouseUp = (ev: MouseEvent) => end(ev);
    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      el.removeEventListener("touchstart", start);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", end);
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // Keyboard input (desktop): WASD/Arrows for direction, Space for boost
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling with arrows/space
      const prevent = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "Space"].includes(
        e.key,
      );
      if (prevent) e.preventDefault();
      if (completed) return;
      keysRef.current.add(e.key);
      if (e.key === " " || e.key === "Space") {
        spaceDownRef.current = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key);
      if (e.key === " " || e.key === "Space") {
        spaceDownRef.current = false;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [completed]);

  // Game loop: fixed timestep integrate, render
  useRaf(() => {
    setState((prev) => {
      if (completed) return prev;
      const next = { ...prev };
      // If keyboard keys are pressed, map them to input dir/strength
      const keys = keysRef.current;
      if (keys.size > 0) {
        // Compute directional intent
        const left = keys.has("ArrowLeft") || keys.has("a") || keys.has("A");
        const right = keys.has("ArrowRight") || keys.has("d") || keys.has("D");
        const up = keys.has("ArrowUp") || keys.has("w") || keys.has("W");
        const down = keys.has("ArrowDown") || keys.has("s") || keys.has("S");
        let dx = (right ? 1 : 0) - (left ? 1 : 0);
        let dy = (down ? 1 : 0) - (up ? 1 : 0);
        if (dx !== 0 || dy !== 0) {
          const len = Math.hypot(dx, dy);
          dx /= len;
          dy /= len;
          // Apply full throttle for any direction key (so Left/Right alone move the sprite)
          next.input.active = true;
          next.input.dir = { x: dx, y: dy };
          next.input.strength = 1;
        } else {
          // no direction keys pressed; keep input inactive unless touch active
          if (!next.input.active) next.input.strength = 0;
        }
        // Handle Space boost on edge
        const spaceNow = spaceDownRef.current;
        const spacePrev = prevSpaceDownRef.current;
        if (spaceNow && !spacePrev) {
          next.input.boostTicks += 15;
        }
        prevSpaceDownRef.current = spaceNow;
      } else {
        // if no keys, revert to touch behavior (zero throttle if inactive)
        if (!next.input.active) next.input.strength = 0;
        prevSpaceDownRef.current = false;
      }
      // if no active input, keep previous dir but zero throttle
      // Remember previous contact for SFX edge detection
      const prevContact = next.wallContact;
      // Integrate physics
      integrate(next);
      // SFX: engine hum level based on current input throttle and speed
      try {
        type SfxApi = {
          setEngine?: (lvl: number, sp?: number) => void;
          bump?: (i?: number) => void;
        };
        const api = (window as unknown as { ZAMBONI_AUDIO?: SfxApi }).ZAMBONI_AUDIO;
        if (api?.setEngine) {
          const throttle = next.input.strength || 0;
          const speed = Math.hypot(next.z.vel.x, next.z.vel.y);
          // Normalize speed roughly against MAX_SPEED (import avoided to keep client minimal)
          const speedNorm = Math.min(1, speed / 180);
          api.setEngine(throttle, speedNorm);
        }
        if (!prevContact && next.wallContact && api?.bump) {
          // Intensity scales with impact speed perpendicular to wall; use speed proxy
          const impact = Math.min(1, Math.hypot(next.z.vel.x, next.z.vel.y) / 220);
          api.bump(impact);
        }
      } catch {}
      if (next.completed && !completed) {
        // persist progress once per completion
        try {
          markComplete(next.level.id);
        } catch {}
        setCompleted(true);
        completedAtRef.current = performance.now();
        // compute grade and par
        const initAvg = initialDirtAvgRef.current || computeGridAvg(next.level.dirt);
        const par = computePar(next.level.rink.width, next.level.rink.height, initAvg);
        setParTime(par);
        // Apply bump-based modifier: slight penalty tiers
        const bumpPenalty = next.bumpCount <= 1 ? 0 : next.bumpCount <= 3 ? 0.05 : 0.12;
        const g = computeGrade(next.elapsed * (1 + bumpPenalty), par);
        setGrade(g);
        // Persist and fetch best time
        const prevBest = getBestTime(next.level.id);
        const saved = setBestTime(next.level.id, next.elapsed);
        setBestTimeState(prevBest === null ? saved : Math.min(prevBest, next.elapsed));
        // Trigger celebratory cheer after grade calc, intensity by grade
        try {
          type SfxApi = { cheer?: (i?: number) => void };
          const api = (window as unknown as { ZAMBONI_AUDIO?: SfxApi }).ZAMBONI_AUDIO;
          let intensity = g === "Cup winner" ? 1 : g === "Playoff contender" ? 0.8 : 0.6;
          if (isFinalLevel) intensity = 1.2; // slight boost on final completion
          api?.cheer?.(intensity);
        } catch {}
        // Update global high scores
        try {
          updateHighScores(next.level.id, next.elapsed, next.bumpCount, next.cleanedPercent);
        } catch {}
        // spawn confetti
        confettiRef.current = spawnConfetti(next.level, isFinalLevel);
      }
      return next;
    });

    const canvas = canvasRef.current;
    if (!canvas) return;
    // Ensure backbuffer exists
    if (!backbufferRef.current) {
      const bb = document.createElement("canvas");
      bb.width = BB_W;
      bb.height = BB_H;
      const bctx = bb.getContext("2d");
      if (bctx) noSmooth(bctx);
      backbufferRef.current = bb;
    }
    // Update particle system and trail using last known state
    if (effectsOn) {
      updateEffects(state, particlesRef, trailRef);
    } else {
      // still maintain a tiny trail buffer for visuals off (cleared fast)
      trailRef.current = [];
      particlesRef.current = [];
    }
    // Update celebration confetti if active
    if (completedAtRef.current !== null) {
      updateConfetti(confettiRef);
    }

    drawPixelPerfect(
      canvas,
      backbufferRef.current,
      state,
      BB_W,
      BB_H,
      (zFramesRef.current as HTMLCanvasElement[][] | null) || undefined,
      particlesRef.current,
      trailRef.current,
      effectsOn,
      confettiRef.current,
      completedAtRef.current,
    );
  });

  useEffect(() => {
    // redraw on size change
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!backbufferRef.current) {
      const bb = document.createElement("canvas");
      bb.width = BB_W;
      bb.height = BB_H;
      const bctx = bb.getContext("2d");
      if (bctx) noSmooth(bctx);
      backbufferRef.current = bb;
    }
    // refresh draw on size/state change (effects already updated during raf)
    drawPixelPerfect(
      canvas,
      backbufferRef.current,
      state,
      BB_W,
      BB_H,
      (zFramesRef.current as HTMLCanvasElement[][] | null) || undefined,
      particlesRef.current,
      trailRef.current,
      effectsOn,
      confettiRef.current,
      completedAtRef.current,
    );
  }, [size.w, size.h, state, effectsOn]);

  // Auto-focus primary button when completed
  useEffect(() => {
    if (completed) {
      const el = nextBtnRef.current || menuBtnRef.current;
      el?.focus();
    }
  }, [completed]);

  // (Removed auto-return; user now decides when to leave final screen)

  // Pre-compute next level id to avoid referencing a helper before declaration
  const nextId = useMemo(() => {
    const idx = LEVELS.findIndex((l) => l.id === levelId);
    if (idx < 0) return LEVELS[0]?.id || "";
    return LEVELS[(idx + 1) % LEVELS.length]?.id || "";
  }, [levelId]);

  return (
    <div className="relative w-full min-h-screen flex flex-col items-center justify-start pt-4 px-2 select-none">
      <div
        className="relative scanlines crt-vignette rounded-lg overflow-hidden shadow-lg"
        style={{ width: size.w, height: size.h }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: size.w,
            height: size.h,
            imageRendering: "pixelated",
            touchAction: "none",
            background: PALETTE.iceLight,
          }}
          width={
            typeof window !== "undefined"
              ? Math.round(size.w * (window.devicePixelRatio || 1))
              : size.w
          }
          height={
            typeof window !== "undefined"
              ? Math.round(size.h * (window.devicePixelRatio || 1))
              : size.h
          }
        />

        {/* Mini HUD (restored) */}
        {!completed && (
          <div className="absolute top-1 left-1 bg-white/80 backdrop-blur-sm rounded px-2 py-1 shadow text-[10px] leading-tight font-pixel text-blue-900 pointer-events-none select-none">
            <div className="font-semibold truncate max-w-[140px]">{level.name}</div>
            <div>
              <span className="opacity-70">Time:</span> {state.elapsed.toFixed(1)}s{" "}
              <span className="ml-2 opacity-70">Bumps:</span> {state.bumpCount}
            </div>
          </div>
        )}

        {completed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="relative pixel-card bg-white/95 rounded-lg p-4 text-center max-w-xs mx-auto outline-none font-pixel text-blue-900"
              role="dialog"
              aria-modal="true"
              aria-label={isFinalLevel ? "All levels complete" : "Level complete"}
              onKeyDown={(e) => {
                // simple focus trap between buttons
                if (e.key !== "Tab") return;
                const els = Array.from(
                  (e.currentTarget as HTMLElement).querySelectorAll("a,button"),
                ) as HTMLElement[];
                if (els.length === 0) return;
                const first = els[0];
                const last = els[els.length - 1];
                const active = document.activeElement as HTMLElement | null;
                if (!e.shiftKey && active === last) {
                  e.preventDefault();
                  first.focus();
                }
                if (e.shiftKey && active === first) {
                  e.preventDefault();
                  last.focus();
                }
              }}
            >
              <div className="text-2xl font-extrabold mb-1">
                {isFinalLevel ? (
                  <div className="flex flex-col items-center">
                    {/* Animated trophy */}
                    <div className="mb-2">
                      <svg
                        width="48"
                        height="48"
                        viewBox="0 0 48 48"
                        className="drop-shadow-sm animate-trophy-float"
                      >
                        <defs>
                          <linearGradient id="trophyGold" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#ffe993" />
                            <stop offset="55%" stopColor="#f8c12a" />
                            <stop offset="100%" stopColor="#d99600" />
                          </linearGradient>
                        </defs>
                        <rect
                          x="18"
                          y="4"
                          width="12"
                          height="20"
                          rx="2"
                          fill="url(#trophyGold)"
                          stroke="#7a4b00"
                        />
                        <rect
                          x="14"
                          y="26"
                          width="20"
                          height="6"
                          rx="1"
                          fill="#7a4b00"
                          stroke="#422600"
                        />
                        <rect
                          x="12"
                          y="32"
                          width="24"
                          height="6"
                          rx="1"
                          fill="#c08a14"
                          stroke="#7a4b00"
                        />
                        <rect
                          x="16"
                          y="38"
                          width="16"
                          height="4"
                          rx="1"
                          fill="#7a4b00"
                          stroke="#422600"
                        />
                        {/* Handles */}
                        <path
                          d="M18 8 h-6 v6 c0 4 2 6 6 6"
                          fill="none"
                          stroke="#7a4b00"
                          strokeWidth="2"
                        />
                        <path
                          d="M30 8 h6 v6 c0 4-2 6-6 6"
                          fill="none"
                          stroke="#7a4b00"
                          strokeWidth="2"
                        />
                        {/* Sparkles */}
                        <g stroke="#ffffff" strokeWidth="1" strokeLinecap="round">
                          <line x1="10" y1="6" x2="10" y2="6" />
                          <line x1="6" y1="20" x2="6" y2="20" />
                          <line x1="42" y1="12" x2="42" y2="12" />
                          <line x1="38" y1="26" x2="38" y2="26" />
                        </g>
                      </svg>
                    </div>
                    <span className="block">All Levels Complete!</span>
                  </div>
                ) : (
                  "Level Complete!"
                )}
              </div>
              <div className="text-sm mb-1">
                Time: {state.elapsed.toFixed(1)}s • Clean: {state.cleanedPercent.toFixed(1)}% •{" "}
                {state.bumpCount} bumps
              </div>
              {grade && (
                <div className="text-lg font-extrabold text-amber-600 mb-2">
                  Grade: {grade}
                  {parTime ? ` • Par ${parTime.toFixed(1)}s` : ""}
                </div>
              )}
              {bestTime !== null && (
                <div className="text-xs text-blue-900/80 mb-2">
                  Best time: {bestTime.toFixed(1)}s
                </div>
              )}
              <div className="flex flex-wrap gap-2 justify-center">
                <Link
                  href={paths.home}
                  ref={menuBtnRef}
                  className="px-3 py-1 pixel-button rounded flex items-center justify-center"
                >
                  {isFinalLevel ? "Continue" : "Menu"}
                </Link>
                {!isFinalLevel && (
                  <Link
                    href={paths.play(nextId)}
                    ref={nextBtnRef}
                    className="px-3 py-1 pixel-button rounded flex items-center justify-center"
                  >
                    Next
                  </Link>
                )}
                <Link
                  href={paths.play(levelId)}
                  className="px-3 py-1 bg-gray-200 rounded border-2 border-blue-900"
                >
                  Retry
                </Link>
              </div>
              {isFinalLevel && (
                <div className="mt-3 text-left">
                  <div className="text-xs font-semibold mb-1 text-blue-900/80">Career Summary</div>
                  <div className="max-h-40 overflow-auto pr-1">
                    <table className="w-full text-[10px] leading-tight">
                      <thead>
                        <tr className="text-blue-900/60">
                          <th className="text-left font-normal">Lvl</th>
                          <th className="text-left font-normal">Best</th>
                          <th className="text-left font-normal">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {finalSummary.map((r) => (
                          <tr key={r.id} className="odd:bg-blue-900/5">
                            <td className="pr-2">{r.name}</td>
                            <td className="pr-2">
                              {r.best !== null ? `${r.best.toFixed(1)}s` : "—"}
                            </td>
                            <td>{r.completed ? "✔" : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-[11px] text-blue-900/70 mt-2">Thanks for playing!</div>
                </div>
              )}
              {isFinalLevel && (
                <style jsx>{`
                  @keyframes trophy-float {
                    0%,
                    100% {
                      transform: translateY(0);
                    }
                    50% {
                      transform: translateY(-4px);
                    }
                  }
                  .animate-trophy-float {
                    animation: trophy-float 2.2s ease-in-out infinite;
                  }
                `}</style>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function drawPixelPerfect(
  canvas: HTMLCanvasElement,
  backbuffer: HTMLCanvasElement,
  state: GameState,
  BB_W: number,
  BB_H: number,
  frames?: HTMLCanvasElement[][],
  particles?: { x: number; y: number }[],
  trail?: FXTrailPoint[],
  effectsOn?: boolean,
  confetti?: { x: number; y: number; color: string }[],
  completedAt?: number | null,
) {
  const ctx = canvas.getContext("2d");
  const bctx = backbuffer.getContext("2d");
  if (!ctx || !bctx) return;
  // Render to backbuffer at low resolution
  bctx.save();
  bctx.clearRect(0, 0, BB_W, BB_H);
  // World -> backbuffer scale (show whole rink scaled down)
  const sx = BB_W / state.level.rink.width;
  const sy = BB_H / state.level.rink.height;
  bctx.setTransform(sx, 0, 0, sy, 0, 0);
  // Draw scene
  drawRink(bctx, state);
  drawDirt(bctx as unknown as CanvasRenderingContext2D, state);
  if (effectsOn) {
    drawGlossTrail(bctx as unknown as CanvasRenderingContext2D, state, trail || []);
    drawParticles(bctx as unknown as CanvasRenderingContext2D, particles || []);
  }
  drawZamboni(bctx as unknown as CanvasRenderingContext2D, state, frames);
  if (completedAt) {
    drawSparkleSweep(bctx as unknown as CanvasRenderingContext2D, state, completedAt);
    drawConfetti(bctx as unknown as CanvasRenderingContext2D, confetti || []);
  }
  bctx.restore();

  // Now upscale to main canvas by integer factor with no smoothing
  const W = canvas.width,
    H = canvas.height;
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  const upScale = Math.max(1, Math.floor(Math.min(W / BB_W, H / BB_H)));
  const drawW = BB_W * upScale;
  const drawH = BB_H * upScale;
  const dx = Math.floor((W - drawW) / 2);
  const dy = Math.floor((H - drawH) / 2);
  ctx.drawImage(backbuffer, 0, 0, BB_W, BB_H, dx, dy, drawW, drawH);
  ctx.restore();
}

function drawRink(ctx: CanvasRenderingContext2D, state: GameState) {
  const { rink } = state.level;
  const { iceLight, board, lineRed, lineBlue, faceoff } = PALETTE;
  ctx.save();
  const w = rink.width,
    h = rink.height,
    r = rink.cornerRadius;

  // Scaled line widths for consistent look
  const lw = Math.max(1, Math.min(w, h) * 0.006);
  const boardLw = Math.max(2, Math.round(lw * 2.0));

  // (Crowd removed)

  // Rink background with rounded corners and dithered fill
  roundRect(ctx, 0, 0, w, h, r);
  ctx.clip();
  const ditherAllowed = state.level.id !== "level-2" && state.level.id !== "level-3";
  const pattern = ditherAllowed
    ? createDitherPattern(ctx, PIXEL_PALETTE.iceBase, PIXEL_PALETTE.iceShade, 4)
    : null;
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
  } else if (!ditherAllowed) {
    // Softer look for levels 2 and 3: base solid plus a faint vertical shading overlay
    ctx.fillStyle = iceLight;
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.04)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    // Solid fallback
    ctx.fillStyle = iceLight;
    ctx.fillRect(0, 0, w, h);
  }

  // Center red line at 50%
  ctx.strokeStyle = lineRed;
  ctx.lineWidth = lw;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  const mid = snapPoint(ctx, w * 0.5, 0).x;
  ctx.moveTo(mid, 0);
  ctx.lineTo(mid, h);
  ctx.stroke();

  // Blue lines at 25% and 75%
  ctx.strokeStyle = lineBlue;
  ctx.lineWidth = lw;
  ctx.beginPath();
  const b1 = snapPoint(ctx, w * 0.25, 0).x;
  const b2 = snapPoint(ctx, w * 0.75, 0).x;
  ctx.moveTo(b1, 0);
  ctx.lineTo(b1, h);
  ctx.moveTo(b2, 0);
  ctx.lineTo(b2, h);
  ctx.stroke();

  // Center faceoff circle only
  const circleR = h * 0.12;
  ctx.strokeStyle = faceoff;
  ctx.lineWidth = lw * 0.9;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.5, circleR, 0, Math.PI * 2);
  ctx.stroke();

  // Goal lines at front of each net (subtle)
  const goalDepth = w * 0.04;
  const goalMouth = h * 0.14;
  const leftGoalLineX = snapPoint(ctx, w * 0.03 + goalDepth, 0).x;
  const rightGoalLineX = snapPoint(ctx, w * 0.97 - goalDepth, 0).x;
  ctx.strokeStyle = lineRed;
  ctx.lineWidth = lw * 0.9;
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  ctx.moveTo(leftGoalLineX, 0);
  ctx.lineTo(leftGoalLineX, h);
  ctx.moveTo(rightGoalLineX, 0);
  ctx.lineTo(rightGoalLineX, h);
  ctx.stroke();

  // Blue goal creases as semi-circles bulging into the rink
  const creaseR = h * 0.12;
  drawCrease(ctx, {
    cx: leftGoalLineX,
    cy: h * 0.5,
    r: creaseR,
    color: lineBlue,
    lw,
    facing: "right",
  });
  drawCrease(ctx, {
    cx: rightGoalLineX,
    cy: h * 0.5,
    r: creaseR,
    color: lineBlue,
    lw,
    facing: "left",
  });

  // Goals (nets) at 3% and 97%
  // reuse goalDepth and goalMouth defined above for goal lines
  drawGoal(ctx, {
    x: w * 0.03,
    y: h * 0.5,
    depth: goalDepth,
    mouth: goalMouth,
    postColor: lineRed,
    netFill: "#ffffff",
    lineWidth: lw,
    flip: false,
  });
  drawGoal(ctx, {
    x: w * 0.97,
    y: h * 0.5,
    depth: goalDepth,
    mouth: goalMouth,
    postColor: lineRed,
    netFill: "#ffffff",
    lineWidth: lw,
    flip: true,
  });

  // Dasher board ads removed

  // Boards outline (slightly thicker, darker for 16-bit depth)
  ctx.globalAlpha = 1;
  ctx.strokeStyle = board || PIXEL_PALETTE.boardEdge;
  ctx.lineWidth = boardLw;
  ctx.lineJoin = "miter";
  ctx.lineCap = "butt";
  roundRect(ctx, 0, 0, w, h, r);
  ctx.stroke();

  // Thin inner edge to enhance crispness
  const innerInset = boardLw * 0.5;
  ctx.strokeStyle = "#0b2147";
  ctx.lineWidth = 1;
  roundRect(
    ctx,
    innerInset,
    innerInset,
    w - innerInset * 2,
    h - innerInset * 2,
    Math.max(0, r - innerInset),
  );
  ctx.stroke();

  ctx.restore();
}

type CreaseOpts = {
  cx: number;
  cy: number;
  r: number;
  color: string;
  lw: number;
  facing: "left" | "right";
};

function drawCrease(ctx: CanvasRenderingContext2D, o: CreaseOpts) {
  // Use a consistent start/end and flip anticlockwise for left-facing to bulge into rink correctly
  const start = -Math.PI / 2;
  const end = Math.PI / 2;
  const anticw = o.facing === "left";

  ctx.save();
  // Soft fill
  ctx.beginPath();
  ctx.arc(o.cx, o.cy, o.r, start, end, anticw);
  ctx.lineTo(o.cx, o.cy);
  ctx.closePath();
  ctx.fillStyle = o.color;
  ctx.globalAlpha = 0.1;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(o.cx, o.cy, o.r, start, end, anticw);
  ctx.strokeStyle = o.color;
  ctx.lineWidth = o.lw * 0.9;
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.restore();
}

type GoalOpts = {
  x: number; // anchor near boards
  y: number; // vertical center
  depth: number; // how far into rink
  mouth: number; // opening height
  postColor: string;
  netFill: string;
  lineWidth: number;
  flip?: boolean; // right-side goal flips direction
};

function drawGoal(ctx: CanvasRenderingContext2D, o: GoalOpts) {
  const halfMouth = o.mouth / 2;
  const width = o.depth;
  const gx = o.flip ? o.x - width : o.x;
  const gy = o.y - halfMouth;
  const rr = Math.max(2, o.lineWidth * 1.5);

  ctx.save();
  // Net fill
  ctx.fillStyle = o.netFill;
  ctx.globalAlpha = 0.92;
  roundRect(ctx, gx, gy, width, o.mouth, rr);
  ctx.fill();

  // Posts outline
  ctx.globalAlpha = 1;
  ctx.strokeStyle = o.postColor;
  ctx.lineWidth = Math.max(1, o.lineWidth * 1.1);
  roundRect(ctx, gx, gy, width, o.mouth, rr);
  ctx.stroke();
  ctx.restore();
}

function drawDirt(ctx: CanvasRenderingContext2D, state: GameState) {
  const { grime } = PALETTE;
  const grid = state.level.dirt;
  const cellW = state.level.rink.width / grid.cols;
  const cellH = state.level.rink.height / grid.rows;
  // 3x3 Bayer matrix (0..8) for chunkier ordered dithering
  const bayer3 = [0, 7, 3, 6, 5, 2, 4, 1, 8];
  const SUB = 3; // sub-cells per axis
  ctx.save();
  ctx.fillStyle = grime;
  ctx.globalAlpha = 1; // crisp pixels; density controlled by dither
  for (let ty = 0; ty < grid.rows; ty++) {
    for (let tx = 0; tx < grid.cols; tx++) {
      const tIdx = ty * grid.cols + tx;
      const d = grid.tile[tIdx];
      if (d <= 0.005) continue;
      // Threshold count 0..9
      const thresh = Math.max(0, Math.min(8, Math.floor(d * 9)));
      if (thresh <= 0) continue;
      // Slight per-tile permutation to avoid visible tiling
      const salt = ((tx * 73856093) ^ (ty * 19349663)) % 9; // cycle within 0..8
      for (let sy = 0; sy < SUB; sy++) {
        for (let sx = 0; sx < SUB; sx++) {
          const mIdx = (sy * SUB + sx + salt) % 9;
          if (bayer3[mIdx] < thresh) {
            const wx = tx * cellW + (sx + 0.5) * (cellW / SUB);
            const wy = ty * cellH + (sy + 0.5) * (cellH / SUB);
            const sp = snapPoint(ctx, wx, wy);
            // draw a single pixel
            ctx.fillRect(sp.x, sp.y, 1, 1);
          }
        }
      }
    }
  }
  ctx.restore();
}

function drawGlossTrail(ctx: CanvasRenderingContext2D, state: GameState, trail: FXTrailPoint[]) {
  if (trail.length < 2) return;
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, Math.min(state.level.rink.width, state.level.rink.height) * 0.004);
  ctx.beginPath();
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    const sp = snapPoint(ctx, p.x, p.y);
    if (i === 0) ctx.moveTo(sp.x, sp.y);
    else ctx.lineTo(sp.x, sp.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, parts: { x: number; y: number }[]) {
  if (parts.length === 0) return;
  ctx.save();
  ctx.fillStyle = "#eefaff";
  for (const p of parts) {
    const sp = snapPoint(ctx, p.x, p.y);
    ctx.globalAlpha = 0.8;
    ctx.fillRect(sp.x, sp.y, 1, 1);
  }
  ctx.restore();
}

function drawConfetti(
  ctx: CanvasRenderingContext2D,
  confetti: { x: number; y: number; color: string }[],
) {
  if (!confetti.length) return;
  ctx.save();
  for (const c of confetti) {
    const sp = snapPoint(ctx, c.x, c.y);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = c.color;
    ctx.fillRect(sp.x, sp.y, 1, 1);
  }
  ctx.restore();
}

function drawSparkleSweep(ctx: CanvasRenderingContext2D, state: GameState, completedAt: number) {
  const now = typeof performance !== "undefined" ? performance.now() : 0;
  const elapsed = Math.max(0, now - completedAt);
  const dur = 1100; // ms
  if (elapsed > dur) return;
  const t = elapsed / dur; // 0..1
  const { width, height } = state.level.rink;
  // Moving vertical band across rink
  const bandX = width * (t * 1.1 - 0.05);
  const bandW = Math.max(6, width * 0.04);
  const g = ctx.createLinearGradient(bandX - bandW, 0, bandX + bandW, 0);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,255,255,0.15)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  // Sprinkle sparkles along the band
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.8;
  const count = 40;
  for (let i = 0; i < count; i++) {
    const yy = (i / count) * height;
    const xx = bandX + (Math.random() - 0.5) * bandW * 1.2;
    const sp = snapPoint(ctx, xx, yy);
    ctx.fillRect(sp.x, sp.y, 1, 1);
  }
  ctx.restore();
}

function drawZamboni(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  frames?: HTMLCanvasElement[][],
) {
  const z = state.z;
  const p = snapPoint(ctx, z.pos.x, z.pos.y);
  const step = Math.PI / 4; // 45 deg quantization
  const q = Math.round(z.heading / step) * step;

  ctx.save();
  ctx.translate(p.x, p.y);

  if (frames && frames.length === 8) {
    // choose frame index 0..7 where 0 is pointing right (0 rad), increasing CCW
    let idx = Math.round((q % (Math.PI * 2)) / step);
    if (idx < 0) idx += 8;
    idx = idx % 8;
    const dirFrames = frames[idx];
    const animCount = dirFrames.length;
    // animation rate depends on speed (idle slow, faster when moving)
    const speed = Math.hypot(z.vel.x, z.vel.y);
    const speedNorm = Math.min(1, speed / 220);
    const fps = 2 + Math.floor(6 * speedNorm); // 2..8 fps
    const animIdx = animCount > 1 ? Math.floor(state.elapsed * fps) % animCount : 0;
    const frame = dirFrames[animIdx];
    const fw = frame.width;
    const fh = frame.height;
    // Draw centered, no extra rotation (baked in)
    ctx.drawImage(frame, Math.round(-fw / 2), Math.round(-fh / 2));
  } else {
    // Fallback to vector drawing with rotation applied
    ctx.rotate(q);
    renderZamboniVector(ctx, z.length, z.width, 0, 1);
  }

  ctx.restore();
}

// Draws the Zamboni vector art centered at (0,0), facing +X (to the right)
function renderZamboniVector(
  ctx: CanvasRenderingContext2D,
  len: number,
  wid: number,
  animStep = 0,
  animCount = 1,
) {
  const { zBlue, zWhite, zTire } = PALETTE;
  // Blocky palette accents
  const blueOutline = "#0b2147"; // dark navy outline
  const blueMid = "#1a4fa3"; // mid blue for stripe
  const windowFill = "#b8e6ff";
  const headlight = "#fff3a1";
  const black = "#000000";

  // Main body: hard block with 1px outline (no rounded corners)
  pixelOutlineRect(
    ctx,
    Math.round(-len / 2),
    Math.round(-wid / 2),
    Math.round(len),
    Math.round(wid),
    blueOutline,
    zBlue,
  );

  // Side stripe (mid-blue) to break up the slab
  ctx.fillStyle = blueMid;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(Math.round(-len / 2 + 2), Math.round(-2), Math.round(len - 4), 3);
  ctx.globalAlpha = 1;

  // Cab block toward front-right (facing +X)
  const cabW = Math.max(10, Math.round(len * 0.35));
  const cabH = Math.max(10, Math.round(wid * 0.62));
  pixelOutlineRect(
    ctx,
    Math.round(len * 0.08),
    Math.round(-cabH / 2),
    cabW,
    cabH,
    blueOutline,
    zWhite,
  );

  // Window rectangle inside cab
  const winPad = 2;
  const winW = Math.max(6, cabW - 2 * winPad - 2);
  const winH = Math.max(6, cabH - 2 * winPad - 4);
  pixelOutlineRect(
    ctx,
    Math.round(len * 0.08 + winPad),
    Math.round(-winH / 2),
    winW,
    winH,
    blueOutline,
    windowFill,
  );

  // Headlights: tiny squares near front bumper
  ctx.fillStyle = headlight;
  ctx.fillRect(Math.round(len * 0.48), Math.round(-wid * 0.22), 2, 2);
  ctx.fillRect(Math.round(len * 0.48), Math.round(wid * 0.2), 2, 2);

  // Bottom dark line hint (single-pixel)
  ctx.fillStyle = blueOutline;
  ctx.globalAlpha = 0.5;
  ctx.fillRect(Math.round(-len / 2 + 1), Math.round(wid / 2 - 2), Math.round(len - 2), 1);
  ctx.globalAlpha = 1;

  // Tires: outlined chunky blocks drawn last to pop
  const tyreLen = Math.round(len * 0.36);
  const tyreH = 8;
  const tyreOffY = Math.round(wid / 2 - tyreH); // let them touch body edges
  // Left (top) tire
  pixelOutlineRect(
    ctx,
    Math.round(-len / 2),
    Math.round(-tyreOffY - tyreH),
    tyreLen,
    tyreH,
    black,
    zTire,
  );
  // Right (bottom) tire
  pixelOutlineRect(ctx, Math.round(-len / 2), Math.round(tyreOffY), tyreLen, tyreH, black, zTire);
  // Animated tread lines (2-frame)
  if (animCount > 1) {
    const stride = 3;
    const shift = animStep % stride; // 0..stride-1
    const treadColor = "#555555";
    ctx.fillStyle = treadColor;
    // top tire treads
    for (let x = 1 + shift; x < tyreLen - 1; x += stride) {
      ctx.fillRect(Math.round(-len / 2 + x), Math.round(-tyreOffY - tyreH + 1), 1, tyreH - 2);
    }
    // bottom tire treads
    for (let x = 1 + shift; x < tyreLen - 1; x += stride) {
      ctx.fillRect(Math.round(-len / 2 + x), Math.round(tyreOffY + 1), 1, tyreH - 2);
    }
  }

  // Rear squeegee: tall thin block with black outline look
  pixelOutlineRect(
    ctx,
    Math.round(-len * 0.45),
    Math.round(-wid / 2),
    4,
    Math.round(wid),
    black,
    zTire,
  );
}

// Pre-render 8 directional Zamboni frames (0..7), each centered with baked rotation
function buildZamboniSprites(len: number, wid: number, animCount = 2): HTMLCanvasElement[][] {
  const frames: HTMLCanvasElement[][] = [];
  const pad = 8; // small padding to avoid clipping outline on rotation
  const fw = Math.round(len + pad * 2);
  const fh = Math.round(wid + pad * 2);

  for (let i = 0; i < 8; i++) {
    const ang = i * (Math.PI / 4);
    const dirFrames: HTMLCanvasElement[] = [];
    for (let a = 0; a < animCount; a++) {
      const c = document.createElement("canvas");
      c.width = fw;
      c.height = fh;
      const g = c.getContext("2d");
      if (!g) {
        dirFrames.push(c);
        continue;
      }
      noSmooth(g);
      g.save();
      g.translate(fw / 2, fh / 2);
      g.rotate(ang);
      renderZamboniVector(g, len, wid, a, animCount);
      g.restore();
      // Harden edges for crisper pixel look (more aggressive threshold)
      hardenAlpha(c, 120);
      dirFrames.push(c);
    }
    frames.push(dirFrames);
  }
  return frames;
}

// Post-process: binarize alpha to reduce anti-aliased edges and get crisp pixels
function hardenAlpha(canvas: HTMLCanvasElement, threshold = 64) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0 || a === 255) continue;
    const on = a >= threshold ? 255 : 0;
    data[i + 3] = on;
  }
  ctx.putImageData(img, 0, 0);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

function pixelOutlineRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  outline: string,
  fill: string,
) {
  ctx.save();
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1;
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.restore();
}

// (removed pixelOutlineRoundRect; we stick to hard-edged rectangles for blocky style)

// --- Effects update helpers ---
function getSqueegeePos(state: GameState) {
  const { z } = state;
  const off = state.z.length * 0.45;
  return { x: z.pos.x - Math.cos(z.heading) * off, y: z.pos.y - Math.sin(z.heading) * off };
}

function updateEffects(
  state: GameState,
  particlesRef: React.MutableRefObject<FXParticle[]>,
  trailRef: React.MutableRefObject<FXTrailPoint[]>,
) {
  const now = performance.now();
  const MAX_PARTICLES = 220;
  const squeegee = getSqueegeePos(state);
  // Update trail (keep ~600ms)
  const trail = trailRef.current;
  trail.push({ x: squeegee.x, y: squeegee.y, t: now });
  const trailHorizon = now - 600;
  while (trail.length && trail[0].t < trailHorizon) trail.shift();
  trailRef.current = trail;

  // Sample dirt at squeegee
  const grid = state.level.dirt;
  const cw = state.level.rink.width / grid.cols;
  const ch = state.level.rink.height / grid.rows;
  const gx = Math.min(grid.cols - 1, Math.max(0, Math.floor(squeegee.x / cw)));
  const gy = Math.min(grid.rows - 1, Math.max(0, Math.floor(squeegee.y / ch)));
  const dirt = grid.tile[gy * grid.cols + gx] || 0;

  // Emit based on speed and dirt
  const speed = Math.hypot(state.z.vel.x, state.z.vel.y);
  const baseRate = speed * 0.02; // world/sec -> particles/frame scale
  const dirtBoost = 6 * dirt;
  const toEmit = Math.min(6, baseRate + dirtBoost);
  const parts = particlesRef.current;
  for (let i = 0; i < toEmit; i++) {
    if (parts.length >= MAX_PARTICLES) break;
    const ang = state.z.heading + Math.PI + (Math.random() - 0.5) * 0.6;
    const spd = 20 + Math.random() * 30;
    parts.push({
      x: squeegee.x,
      y: squeegee.y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      life: 0,
      max: 300 + Math.random() * 400,
    });
  }
  // Integrate particles
  const dt = 16; // approx ms per frame; we keep it simple
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    const t = p.life / p.max;
    // simple motion with friction
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.x += (p.vx / 1000) * dt;
    p.y += (p.vy / 1000) * dt;
    // fade out and cull
    if (t >= 1) {
      parts.splice(i, 1);
    }
  }
  particlesRef.current = parts;
}

// --- Celebration helpers ---
function computeGridAvg(grid: { tile: number[] }) {
  let sum = 0;
  for (let i = 0; i < grid.tile.length; i++) sum += grid.tile[i];
  return sum / Math.max(1, grid.tile.length);
}

function computePar(w: number, h: number, initAvg: number) {
  // Heuristic par: base + area term + initial dirt term
  const area = w * h; // world units^2
  const base = 18;
  const areaTerm = area / 9000; // ~25s small, ~57s large
  const dirtTerm = initAvg * 22;
  return Math.max(10, base + areaTerm + dirtTerm);
}

function computeGrade(timeSec: number, par: number) {
  // Three-tier results from best to worst
  if (timeSec <= par * 0.9) return "Cup winner";
  if (timeSec <= par * 1.15) return "Playoff contender";
  return "Team rebuild";
}

function spawnConfetti(
  level: GameState["level"],
  big = false,
): { x: number; y: number; vx: number; vy: number; color: string; life: number; max: number }[] {
  const colors = ["#ff6b6b", "#51cf66", "#4dabf7", "#fcc419", "#f783ac", "#ffffff"];
  const out: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    max: number;
  }[] = [];
  const { width, height } = level.rink;
  const base = big ? 180 : 90;
  for (let i = 0; i < base; i++) {
    const x = Math.random() * width;
    const y = Math.random() * (height * 0.6);
    const ang = Math.random() * Math.PI * 2;
    const spd = 30 + Math.random() * (big ? 90 : 60);
    out.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd,
      color: colors[i % colors.length],
      life: 0,
      max: 1400 + Math.random() * (big ? 1000 : 600),
    });
  }
  return out;
}

function updateConfetti(
  confettiRef: React.MutableRefObject<
    { x: number; y: number; vx: number; vy: number; color: string; life: number; max: number }[]
  >,
) {
  const parts = confettiRef.current;
  const dt = 16;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life += dt;
    // gravity and drag
    p.vy += 0.35;
    p.vx *= 0.985;
    p.vy *= 0.99;
    p.x += (p.vx / 1000) * dt;
    p.y += (p.vy / 1000) * dt;
    if (p.life >= p.max) parts.splice(i, 1);
  }
  confettiRef.current = parts;
}
