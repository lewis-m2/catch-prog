# Changelog

## Phase 2: Timers

**What changed**
- Timers screen (SPEC §3):
  - **Session clock**: Start, Pause for a break, Resume. Shows rowing time, total time and break time.
    End session asks first and saves the session.
  - **Piece clock**: Start, Split, Stop, Reset, with an optional label and target time (`m:ss`).
    It shows the difference from the target, and splits as lap and total, plus a Finish row after Stop.
    Stopping saves the piece to the session.
  - **Undo stop** (an addition to the spec): an accidental Stop can be undone, and the clock carries on as though it had never stopped.
  - Starting a piece also starts the session, or ends a break, so a piece always belongs to a session.
- **SessionBar** is live on every screen: rowing time (or "Break"), and the piece time while a piece runs.
- Clocks are stored as start time + time already counted, and saved to IndexedDB on every start, stop and split.
  A reload, crash or screen lock loses nothing.
- Start, Stop and Split act when the finger touches down, like the rate pad.
- The screen stays awake for the whole session, breaks included. Timers shows a warning if the phone refuses.
- Rate readings are now linked to the session, and to the piece while one is running.
- The update and "ready offline" banners wait until no session is running, so they can't cover Split or Stop.
- Fix: tap times now use the wall clock. The browser's page clock can fall behind after the phone sleeps.

**How to try it**
- Timers: Start session → Pause/Resume → Start piece → Split a few times → Stop → Undo stop → Stop → Reset.
- Reload mid-piece, or close the app and reopen it: both clocks carry on where they were.
- End session: the first tap asks and the second confirms. A fast double tap won't end it.

## Phase 1: Stroke rate

**What changed**
- Rate screen (SPEC §2): stroke-count selector (1 · 2 · 3, remembered), huge one-decimal readout,
  trend arrow with the change in spm, and the last 6 readings. The lower ~60% of the screen is the tap pad.
- Taps are timed from the moment the finger touches down, not when it lifts.
- Continuous mode is on: each tap that finishes a reading also starts the next one.
  A first tap is discarded after 10 s, and anything outside 10–60 spm shows "missed?" and counts as a fresh first tap.
- Each reading is saved to IndexedDB (Dexie) with its time and stroke count.
- Settings now live in one saved store (Zustand). Your theme choice resets to Sun once because of this.

**Not yet (comes with later phases)**
- The crew chip and piece link on readings need crews (Phase 3) and pieces (Phases 2 and 4).
  Readings are saved now and will be linked to the session from Phase 2.
- Continuous mode and the auto-reset time are fixed until the Settings screen in Phase 3.
- The recent-readings strip starts empty each time the app opens; the saved log becomes visible in Phase 5.

**How to try it**
- Rate tab: pick 1 stroke, tap the pad at a steady beat (for example, one tap every 2 s ≈ 30 spm).
  A quick double tap should show "missed?". Wait 10 s and the pad goes back to "Tap at the catch".
- Close and reopen the app: the stroke count is remembered.

## Phase 0: Shell

**What changed**
- Vite + React 18 + TypeScript (strict) + Tailwind, with colours as CSS custom properties.
- Installable PWA: manifest, icons and precaching, so the app runs with no network after first load.
  New versions show a Reload prompt and never reload by themselves mid-session.
- App layout: SessionBar placeholder, placeholder screens, and the four-tab TabBar. Settings opens from the gear on Crews.
- Sun / Dawn / Auto theme, remembered between launches.
- Wake-lock and haptics hooks. Settings has temporary "Device checks" controls for trying them.
- GitHub Actions workflow: lint, test and build every push to `main`, then deploy to GitHub Pages.

**How to try it**
- Locally: `npm run build && npm run preview`, then open the URL it prints.
- On a phone: open the deployed site, install it, turn on airplane mode, and relaunch it.
  Settings shows the build ID, so you can confirm which deploy you're running.
