# 🧊 Zamboni Driver

Retro pixel zamboni resurfacing game built with Next.js (App Router) + TypeScript + Tailwind. Drive a mini zamboni to polish larger and tougher rinks, chase personal best times, and build a career scoreboard.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js) ![React](https://img.shields.io/badge/React-19-61dafb?style=flat&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat&logo=typescript) ![License](https://img.shields.io/badge/License-MIT-green?style=flat)

---

## 🎮 Gameplay

- 3 handcrafted levels (pond → beer league → big show) with unique dirt patterns & increasing size.
- Clean ice by driving over dirty tiles; time, bumps, and cleaned percent combine into a grade vs. par.
- Mini HUD (time, bumps, level) while playing; completion dialog shows grade, par time, best time.
- Persistent high scores (fastest run, fewest bumps, clean %, per‑level bests, composite rank).
- Skeleton shimmer placeholders avoid hydration mismatch; data loads client-side.
- Optional particle & trail effects (toggle persists).

## 🧪 Core Systems

| System        | Highlights                                                            |
| ------------- | --------------------------------------------------------------------- |
| Rendering     | 320×180 backbuffer → integer upscale (crisp pixels)                   |
| Input         | Touch drag (analog), WASD / Arrow keys, boost tap/flick               |
| Dirt Grid     | Procedural noise pattern per level; incremental cleaning & % tracking |
| Scoring       | Best time + aggregated high score metrics & composite formula         |
| Persistence   | localStorage (progress, best times, high scores, effects toggle)      |
| Accessibility | Deterministic SSR + client hydration-safe placeholders                |

## 🛠 Tech Stack

- Next.js 15 App Router (React 19)
- TypeScript
- Tailwind CSS
- Custom Canvas rendering (no external game engine)
- ESLint (flat) + Prettier + Husky + lint-staged

## 🚀 Quick Start

```bash
npm install
npm run dev
# open http://localhost:3000
```

Production build & run:

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

| Path                                 | Purpose                                      |
| ------------------------------------ | -------------------------------------------- |
| `src/components/Game/CanvasGame.tsx` | Core loop, rendering, input, completion UI   |
| `src/utils/gameLogic.ts`             | Physics, integration, cleaning logic         |
| `src/utils/levels.ts`                | Level definitions & dirt generation          |
| `src/utils/highScores.ts`            | High score aggregation & persistence         |
| `src/components/UI/MainMenu.tsx`     | Level select + scoreboard (skeleton shimmer) |

## 🧩 Architecture Notes

- Fixed logical world -> low-res backbuffer -> integer upscale for artifact-free pixels.
- Responsive canvas sizing keeps aspect while shrinking to fit viewport.
- All localStorage reads deferred to `useEffect` (prevents hydration mismatch warnings).
- State updated inside a custom RAF hook for smooth animation.

## 🏅 Grading & Par

Par derives from rink area \* initial dirt density; final grade compares adjusted time (bump penalties) to par tiers. High scores update after each level completion.

## 🔐 Persistence Keys

| Key                          | Data                                                 |
| ---------------------------- | ---------------------------------------------------- |
| `zamboni.progress.v1`        | Set of completed level ids                           |
| `zamboni.bestTime.<levelId>` | Best time per level                                  |
| `zamboni.highscores.v1`      | Aggregate stats (fastest, bumps, clean %, composite) |
| `zamboni.effects.v1`         | Effects toggle ("1"/"0")                             |

## 🧵 Style & Tooling

- ESLint + Prettier enforced in pre-commit via Husky & lint-staged.
- Pixel font styling + scanline / CRT vignette for retro feel.

## 🐞 Dev Tips

- Adding a level: append to `LEVELS` (keep 16:9 for pixel scaling), generate a dirt grid.
- Avoid accessing `window` / `localStorage` outside effects for SSR stability.
- Keep new art within logical rink dimensions to preserve integer upscale crispness.

## 🗺 Roadmap Ideas

- Replay ghost overlay
- Optional camera zoom accessibility (prototype previously removed)
- Online leaderboard (requires backend/service)
- Expanded SFX & music mute toggle UI control

## 🤝 Contributing

PRs welcome. Run `npm run lint` before pushing.

## 📄 License

MIT

---

Enjoy resurfacing the ice! 🧊
