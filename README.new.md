# 🧊 Zamboni Driver

Pixel-arty retro ice resurfacering game built with Next.js (App Router) + TypeScript + Tailwind. Drive a tiny (but mighty) zamboni to polish progressively larger rinks, chase personal bests, and climb the career stats board.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js) ![React](https://img.shields.io/badge/React-19-61dafb?style=flat&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat&logo=typescript) ![License](https://img.shields.io/badge/License-MIT-green?style=flat)

---

## 🎮 Gameplay

- 3 handcrafted levels (pond -> beer league -> big show) with increasing rink size & dirt patterns.
- Clean ice by driving over dirty tiles; percent clean + time + bumps feed into a grade.
- Mini HUD (time, bumps, level) during play; completion screen with grade, par time, and best time.
- Persistent high scores & per‑level stats (localStorage) with composite ranking.
- Skeleton shimmer placeholders avoid hydration mismatch while scores load.
- Optional particles / trail effects toggle (persisted).

## 🧪 Core Systems

| System        | Highlights                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------- |
| Rendering     | 320×180 backbuffer -> integer upscale for crisp pixels (no smoothing)                       |
| Physics/Input | Touch drag (virtual analog), WASD / Arrows + boost flick & space boost                      |
| Dirt Grid     | Procedural noise & level‑specific patterns, incremental cleaning & cleaned percent tracking |
| Scoring       | Best time per level + global aggregates (fastest, fewest bumps, clean %, composite)         |
| Persistence   | localStorage (progress, best times, high score aggregates, effects toggle)                  |
| Accessibility | Deterministic SSR markup (no client-only flashes), focus trapping on dialogs                |

## 🛠 Tech Stack

- Next.js 15 App Router (React 19)
- TypeScript + strict-ish typing
- Tailwind CSS utility styling
- Custom canvas + backbuffer pipeline (no game framework)
- ESLint (flat config) + Prettier + Husky + lint-staged

## 🚀 Quick Start

```bash
npm install
npm run dev
# open http://localhost:3000
```

Build & run production:

```bash
npm run build
npm start
```

Lint / format:

```bash
npm run lint
npm run format
```

## 📁 Key Files

| Path                                 | Purpose                                             |
| ------------------------------------ | --------------------------------------------------- |
| `src/components/Game/CanvasGame.tsx` | Core loop, rendering, input, completion UI          |
| `src/utils/gameLogic.ts`             | Physics integration, collision, dirt cleaning logic |
| `src/utils/levels.ts`                | Level definitions (dimensions, dirt distributions)  |
| `src/utils/highScores.ts`            | LocalStorage high score aggregation helpers         |
| `src/components/UI/MainMenu.tsx`     | Level select & scoreboard (with shimmer)            |

## 🧩 Architecture Notes

- Fixed logical world (level rink dims) mapped onto small pixel backbuffer -> crisp scaling.
- drawPixelPerfect handles world -> backbuffer, then integer upscale.
- Responsive sizing computes canvas size to fit viewport while preserving 16:9 aspect.
- All localStorage reads deferred to `useEffect` to prevent hydration mismatch.
- Game state immutable-ish updates inside RAF hook (`useRaf`).

## 🏅 Grading & Par

Par time is computed from rink area \* initial dirt density. Final grade scales off adjusted time (bump penalties) vs par. Achievements update high score aggregates after each completion.

## 🔐 Persistence Keys

| Key                          | Data                    |
| ---------------------------- | ----------------------- |
| `zamboni.progress.v1`        | Completed level ids set |
| `zamboni.bestTime.<levelId>` | Best time numeric       |
| `zamboni.highscores.v1`      | Aggregate stats object  |
| `zamboni.effects.v1`         | Particle effects toggle |

## 🧵 Style & Tooling

- Flat ESLint config with `eslint-plugin-prettier` to surface formatting issues as lint errors.
- Husky pre-commit runs lint-staged (format + fix changed files only).
- Pixel font (retro) via CSS classes; scanline / CRT vignette effect wrappers for vibe.

## 🐞 Development Tips

- To add a new level: append to `LEVELS` in `levels.ts` (ensure 16:9 dims), tune dirt grid.
- Keep rink width/height scaled relative to backbuffer (currently 320×180 baseline) for best pixel fidelity.
- Avoid accessing `window` / `localStorage` during module init to keep SSR stable.

## 🗺 Roadmap (Ideas)

- Camera pan/zoom accessibility toggle (was prototyped & reverted).
- Replay ghost path overlay.
- Online leaderboard (server/backend required).
- Sound effect refinement & music mute toggle UI.

## 🤝 Contributing

PRs welcome. Please run `npm run lint` before submitting.

## 📄 License

MIT

---

Enjoy resurfacing the ice! 🧊
