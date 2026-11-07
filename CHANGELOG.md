# Changelog

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
