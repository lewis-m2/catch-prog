# CLAUDE.md — Launch (rowing coach app)

## What this is
A phone web app (installable PWA) for a high-school rowing coach to use in a coaching launch:
stroke-rate calculator, session + piece stopwatches, staggered-start pieces based on prognostic 2k times,
and quick crew notes. **Full feature spec: `SPEC.md` — read it before starting any feature.**

The owner has a CS degree and some Flutter experience but is not a day-to-day web developer.
Explain non-obvious decisions briefly in commit messages / PR notes; keep the code readable over clever.

## Non-negotiables
1. **Timing correctness.** Every clock is stored as `{ startedAt: epochMs | null, accumulatedMs }` and
   elapsed time is *derived* from `Date.now()`. Never increment a counter in `setInterval`.
   State is persisted on every start/stop/split, so a reload, screen lock or crash loses nothing.
2. **Offline-first.** The app must fully work with no network after first load. No runtime CDN calls.
3. **Usable with wet hands in sunlight.** Primary buttons ≥ 64px tall, others ≥ 48px. High contrast.
   Tabular numerals (`font-variant-numeric: tabular-nums`) on all times. No precision gestures.
4. **Mobile-first.** Design for a ~390px wide Android phone in portrait. Desktop layout is not a goal.
5. **No backend in v1.** All data local (IndexedDB). Use UUIDs and `updatedAt` on records so sync can be added later.

## Stack
- Vite + React 18 + TypeScript (strict)
- Tailwind CSS (design tokens in `tailwind.config.ts`, see Design below)
- `vite-plugin-pwa` (Workbox) — manifest, icons, precache, auto-update prompt
- Dexie (IndexedDB) for persistence; Zustand for in-memory UI state
- React Router (hash router is fine — easy static hosting)
- Vitest for unit tests; Playwright optional later
- Deploy: static build to Cloudflare Pages or GitHub Pages (HTTPS is required for install + service worker)

## Commands
- `npm run dev` — dev server; `npm run dev -- --host` to open on the phone over home Wi-Fi
- `npm run test` — Vitest
- `npm run build && npm run preview` — production build (test install/offline here)
- `npm run lint` / `npm run typecheck`

## Project layout
```
src/
  lib/            # pure logic, no React — fully unit-tested
    time.ts       # stopwatch maths, formatting (m:ss.s), parsing
    rate.ts       # stroke-rate maths, sanity checks
    stagger.ts    # predicted times (linear, Paul's law), start offsets
    prognostic.ts # CSV import/export + lookup
    export-md.ts  # Obsidian markdown export
  data/           # prognostics-default.csv (built-in School + Club tables, from the coach's spreadsheet)
  db/             # Dexie schema + repositories
  state/          # Zustand stores (active session, active piece)
  hooks/          # useNow (rAF tick), useWakeLock, useHaptics
  components/     # SessionBar, TabBar, BigButton, TimeDisplay, CrewChip, TimeDrumPicker, AdjustSheet ...
  screens/        # Rate, Timers, Pieces (Setup / Live / Results), Crews, CrewDetail, Notes, Settings
```

## Rules for implementation
- **Logic lives in `src/lib` as pure functions with tests first.** Especially `stagger.ts` and `rate.ts`:
  include the worked example from SPEC §5b as a test (A 6:00 / B 6:30 / C 7:00, 1000 m → offsets 30 s, 15 s, 0 s),
  and test the working-time precedence: session adjustment → crew override → table row.
- Display ticking uses a single `useNow()` hook driven by `requestAnimationFrame` (throttle to ~10 fps).
- Wake lock: acquire when a session is active, re-acquire on `visibilitychange`; fail silently if unsupported.
- Haptics: `navigator.vibrate` wrapped in a helper that no-ops when unsupported (iOS).
- Every destructive action (end session, delete crew, reset piece) needs a confirm step.
- Keep dependencies minimal; ask before adding a new library.
- Accessibility: buttons have labels; colour is never the only signal (use +/− signs and text too).

## Design
Mockups exist (shared separately as a Claude Design artifact). Tokens:
- Theme "Sun" (default): bg `#FFFFFF`, surface `#F2F4F5`, ink `#0B0F12`, muted `#5B6670`,
  accent `#0057FF` (actions), go `#00A35C`, stop/slow `#E5322D`, warn `#F5A400`.
- Theme "Dawn" (dark): bg `#0B0F12`, surface `#1A2026`, ink `#F4F6F8`, same accents slightly brighter.
- All colours are CSS custom properties on `:root` (`--bg`, `--surface`, `--ink`, `--muted`, `--accent`, `--go`, `--stop`, `--warn`)
  and Tailwind reads them, because the coach can change accent / go / stop colours and text size in Settings (SPEC §7c).
- Font: system UI stack; numerals bold, tabular. Big time display ~72–96px.
- Layout: SessionBar (top, ~56px) · screen content · TabBar (bottom, 64px): Rate · Timers · Pieces · Crews.
  Settings opens from a gear in the Crews header.

## Build order (do one phase at a time; stop for review at the end of each)
- **Phase 0 — Shell**: scaffold, Tailwind tokens, PWA manifest + icons, TabBar, SessionBar placeholder,
  theme toggle, wake-lock + haptics hooks, deploy pipeline. Verify install on Android + works in airplane mode.
- **Phase 1 — Stroke rate** (SPEC §2) with tests.
- **Phase 2 — Timers** (SPEC §3): session clock + piece clock with splits, persistence, live SessionBar.
- **Phase 3 — Crews, prognostics & settings** (SPEC §4, §7): built-in School/Club default tables with local overrides,
  programme setting, CSV import/export, crew CRUD, quick-add paste, appearance settings (theme, accent, go/stop, text size).
- **Phase 4 — Staggered pieces** (SPEC §5): setup → live → results, saved to session. The tap-a-crew adjust sheet with the
  drum picker, session adjustments, `Use actual time` and `Repeat piece` are part of this phase, not extras.
- **Phase 5 — Sessions & notes** (SPEC §6): session history, quick notes with tags, Markdown export.
- Later phases (SPEC §8) — do **not** start without being asked.

## Definition of done for each phase
Tests pass, typecheck clean, works in a production build on a real phone (installed, offline),
timers survive a reload mid-run, and a short note in `CHANGELOG.md` saying what changed and how to try it.
