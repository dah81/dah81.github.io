"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { LEVELS } from "@/utils/levels";
import { paths } from "@/utils/paths";
import { getProgress } from "@/utils/progress";
import { getHighScores, resetHighScores } from "@/utils/highScores";
import type { HighScores } from "@/utils/highScores";

export default function MainMenu() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  // Avoid calling localStorage during the server render to prevent hydration mismatch.
  const [scores, setScores] = useState<HighScores>({});
  const [loadingScores, setLoadingScores] = useState(true);
  useEffect(() => {
    const { completed } = getProgress();
    setCompleted(new Set(completed));
    // Safe to read localStorage on client only.
    const hs = getHighScores();
    setScores(hs);
    setLoadingScores(false);
  }, []);

  const firstUnfinished = useMemo(
    () => LEVELS.find((l) => !completed.has(l.id))?.id ?? LEVELS[0].id,
    [completed],
  );

  return (
    <div className="relative w-full min-h-[80vh] flex flex-col items-center justify-center p-6">
      <div className="relative scanlines crt-vignette px-6 py-8 rounded-lg bg-gradient-to-b from-blue-50 to-blue-100 w-full max-w-2xl pixel-card">
        <header className="text-center mb-6">
          <div className="flex items-center justify-center gap-3">
            <Image src="/icons/stick.svg?v=4" alt="" width={20} height={20} aria-hidden />
            <h1 className="font-pixel glint-title text-4xl tracking-[0.2em] text-blue-900 drop-shadow-[2px_2px_0_#eaf6ff]">
              ZAMBONI: CLEAN SHEET
            </h1>
            <Image src="/icons/net.svg" alt="" width={20} height={20} aria-hidden />
          </div>
          <p className="text-sm text-blue-700 mt-1">Blades of Steel-inspired. Swipe or WASD.</p>
          <div className="mt-4 flex justify-center">
            <Link
              href={paths.play(firstUnfinished)}
              className="px-4 py-2 pixel-button rounded flex items-center gap-2"
            >
              <Image src="/icons/puck.svg" alt="" width={14} height={14} aria-hidden />
              <span className="font-pixel text-lg">Continue</span>
            </Link>
          </div>
        </header>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LEVELS.map((lvl) => {
            const done = completed.has(lvl.id);
            const isPrimary = lvl.id === firstUnfinished;
            return (
              <li key={lvl.id} className="p-4 rounded bg-white/85 pixel-card">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-extrabold text-blue-900 flex items-center gap-2">
                    {lvl.id === "level-1" && (
                      <Image src="/icons/pond.svg" alt="" width={16} height={16} aria-hidden />
                    )}
                    {lvl.id === "level-2" && (
                      <Image src="/icons/beer.svg" alt="" width={16} height={16} aria-hidden />
                    )}
                    {lvl.id === "level-3" && (
                      <Image src="/icons/trophy.svg" alt="" width={16} height={16} aria-hidden />
                    )}
                    <span>{lvl.name}</span>
                  </h2>
                  {done ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-600 text-white">
                      ✓ Completed
                    </span>
                  ) : isPrimary ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500 text-white">
                      New!
                    </span>
                  ) : null}
                </div>
                {typeof lvl.difficulty !== "undefined" && (
                  <div className="mb-2 text-amber-500">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <span
                        key={i}
                        className={`inline-block mr-0.5 ${i < (lvl.difficulty || 0) ? "" : "opacity-30"}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                )}
                {lvl.description && (
                  <p className="text-xs text-blue-900/80 mb-3">{lvl.description}</p>
                )}
                <div className="flex gap-2">
                  <Link
                    href={paths.play(lvl.id)}
                    className={`px-3 py-2 rounded pixel-button flex items-center gap-2 ${isPrimary ? "" : "bg-[linear-gradient(#2563eb,#1e3a8a)]"}`}
                  >
                    <Image src="/icons/puck.svg" alt="" width={12} height={12} aria-hidden />
                    <span className="font-pixel text-base">Play</span>
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Scoreboard */}
        <div className="mt-8 p-4 rounded-lg bg-white/90 pixel-card">
          <h2 className="text-lg font-extrabold text-blue-900 mb-2 flex items-center gap-2">
            <span>Scoreboard</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-blue-900/90">
            <div className="bg-blue-50/60 rounded p-2">
              <div className="font-semibold mb-0.5">Fastest Time</div>
              {loadingScores ? (
                <div className="flex gap-2 items-center">
                  <span className="skeleton-block w-10 h-3" />
                  <span className="skeleton-block w-16 h-3" />
                </div>
              ) : scores.fastestTime ? (
                <div>
                  {scores.fastestTime.time.toFixed(1)}s{" "}
                  <span className="ml-1 text-[10px] opacity-70">
                    {LEVELS.find((l) => l.id === scores.fastestTime!.levelId)?.name ||
                      scores.fastestTime.levelId}
                  </span>
                </div>
              ) : (
                <div className="opacity-50">—</div>
              )}
            </div>
            <div className="bg-blue-50/60 rounded p-2">
              <div className="font-semibold mb-0.5">Fewest Bumps</div>
              {loadingScores ? (
                <div className="flex gap-2 items-center">
                  <span className="skeleton-block w-6 h-3" />
                  <span className="skeleton-block w-20 h-3" />
                </div>
              ) : scores.fewestBumps ? (
                <div>
                  {scores.fewestBumps.bumps}{" "}
                  <span className="ml-1 text-[10px] opacity-70">
                    {LEVELS.find((l) => l.id === scores.fewestBumps!.levelId)?.name ||
                      scores.fewestBumps.levelId}
                  </span>
                </div>
              ) : (
                <div className="opacity-50">—</div>
              )}
            </div>
            <div className="bg-blue-50/60 rounded p-2">
              <div className="font-semibold mb-0.5">Highest Clean %</div>
              {loadingScores ? (
                <div className="flex gap-2 items-center">
                  <span className="skeleton-block w-8 h-3" />
                  <span className="skeleton-block w-20 h-3" />
                </div>
              ) : scores.highestClean ? (
                <div>
                  {scores.highestClean.clean.toFixed(1)}%{" "}
                  <span className="ml-1 text-[10px] opacity-70">
                    {LEVELS.find((l) => l.id === scores.highestClean!.levelId)?.name ||
                      scores.highestClean.levelId}
                  </span>
                </div>
              ) : (
                <div className="opacity-50">—</div>
              )}
            </div>
            <div className="bg-blue-50/60 rounded p-2">
              <div className="font-semibold mb-0.5">Best Composite</div>
              {loadingScores ? (
                <div className="flex gap-2 items-center">
                  <span className="skeleton-block w-10 h-3" />
                  <span className="skeleton-block w-20 h-3" />
                </div>
              ) : scores.bestComposite ? (
                <div>
                  {scores.bestComposite.score}{" "}
                  <span className="ml-1 text-[10px] opacity-70">
                    {LEVELS.find((l) => l.id === scores.bestComposite!.levelId)?.name ||
                      scores.bestComposite.levelId}
                  </span>
                </div>
              ) : (
                <div className="opacity-50">—</div>
              )}
            </div>
            {/* Per-level bests */}
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Per-Level Personal Bests</h3>
              <div className="overflow-auto max-h-48 pr-1">
                <table className="w-full text-[10px] leading-tight">
                  <thead>
                    <tr className="text-blue-900/60">
                      <th className="text-left font-normal">Level</th>
                      <th className="text-left font-normal">Time</th>
                      <th className="text-left font-normal">Bumps</th>
                      <th className="text-left font-normal">Clean%</th>
                      <th className="text-left font-normal">Comp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingScores
                      ? LEVELS.map((l) => (
                          <tr key={l.id} className="odd:bg-blue-900/5">
                            <td className="pr-2">
                              <span className="skeleton-block h-3 w-20" />
                            </td>
                            <td className="pr-2">
                              <span className="skeleton-block h-3 w-10" />
                            </td>
                            <td className="pr-2">
                              <span className="skeleton-block h-3 w-6" />
                            </td>
                            <td className="pr-2">
                              <span className="skeleton-block h-3 w-8" />
                            </td>
                            <td>
                              <span className="skeleton-block h-3 w-8" />
                            </td>
                          </tr>
                        ))
                      : LEVELS.map((lvl) => {
                          const row = scores.perLevel?.[lvl.id];
                          return (
                            <tr key={lvl.id} className="odd:bg-blue-900/5">
                              <td className="pr-2">{lvl.name}</td>
                              <td className="pr-2">{row ? `${row.time.toFixed(1)}s` : "—"}</td>
                              <td className="pr-2">{row ? row.bumps : "—"}</td>
                              <td className="pr-2">{row ? `${row.clean.toFixed(1)}%` : "—"}</td>
                              <td>{row ? row.composite : "—"}</td>
                            </tr>
                          );
                        })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-blue-50/60 rounded p-2">
              <div className="font-semibold mb-0.5">Total Runs</div>
              <div>
                {loadingScores ? (
                  <span className="skeleton-block h-3 w-8" />
                ) : (
                  (scores.totalRuns ?? 0)
                )}
              </div>
            </div>
            <div className="bg-blue-50/60 rounded p-2">
              <div className="font-semibold mb-0.5">Avg Clean %</div>
              <div>
                {loadingScores ? (
                  <span className="skeleton-block h-3 w-10" />
                ) : scores.totalRuns && scores.totalRuns > 0 ? (
                  (scores.totalIceCleanedPct! / scores.totalRuns).toFixed(1)
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <button
              className="text-[10px] underline text-blue-900/60 hover:text-blue-900"
              onClick={() => {
                resetHighScores();
                setScores(getHighScores());
              }}
            >
              Reset scoreboard
            </button>
          </div>
        </div>
        {/* Skeleton styles */}
        <style jsx>{`
          .skeleton-block {
            position: relative;
            display: inline-block;
            overflow: hidden;
            border-radius: 4px;
            background: linear-gradient(
              90deg,
              rgba(180, 205, 235, 0.45) 0%,
              rgba(220, 235, 250, 0.9) 50%,
              rgba(180, 205, 235, 0.45) 100%
            );
            background-size: 200% 100%;
            animation: shimmer 1.2s ease-in-out infinite;
          }
          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
        <footer className="mt-6 flex items-center justify-between text-xs text-blue-800/80">
          <span>Progress saved locally</span>
          <Link
            href={paths.home}
            onClick={(e) => {
              e.preventDefault();
              try {
                localStorage.removeItem("zamboni.progress.v1");
                location.reload();
              } catch {}
            }}
            className="underline"
          >
            Reset progress
          </Link>
        </footer>
      </div>
    </div>
  );
}
