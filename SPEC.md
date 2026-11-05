# Launch — Rowing Coach App: Feature Spec

Working name: **Launch** (as in the coach's launch). Rename freely.

A phone app used in a coaching launch on the water. Priorities, in order:
**reliable timing → readable in sunlight → usable one-handed with wet hands → works with no signal.**

---

## 1. Global behaviour (applies to every screen)

- **Session bar** pinned to the top of every screen: shows the overall rowing clock (running/paused) and the piece clock if one is running. Tapping it jumps to the Timers screen. The coach should never lose sight of the main clock.
- **Bottom tab bar** with 4 tabs: `Rate` · `Timers` · `Pieces` · `Crews`. (Notes live inside Crews and the session log for v1.) **Settings** opens from a gear button in the Crews header (see §7).
- **Screen stays awake** while a session is active (Screen Wake Lock API; re-acquire on `visibilitychange`).
- **Timers survive everything**: screen lock, app switch, page reload, phone restart mid-session. All clocks are stored as timestamps (see §8), never as a ticking counter.
- **Haptics** on every primary tap (`navigator.vibrate`, Android only — fail silently on iOS).
- **Big targets**: minimum 64px tall for primary buttons, 48px for everything else. No gestures that need precision (no small swipes, no long-press-only actions).
- **High-contrast "Sun" theme** as default (near-black on white, bold numerals) plus a dark theme for dawn sessions. Tabular numerals for all times.
- **Offline-first**: everything works with no network. No feature in v1 needs a server.

---

## 2. Stroke Rate

Coach taps when the crew hits a chosen point in the stroke (e.g. the catch), then taps again at the same point N strokes later.

- **Whole lower ~60% of the screen is the tap pad.** First tap starts timing (pad shows "tap again at catch"); second tap computes the rate.
- **Stroke count selector**: 1 · 2 · 3 strokes (default 2). Remembered between sessions.
- **Rate = 60 × N ÷ Δt (seconds)**, shown to 1 decimal place, huge.
- **Continuous mode** (default on): the second tap also becomes the first tap of the next measurement, so tapping every N strokes gives a running readout without resetting.
- **Auto-reset**: if more than 10 s passes after a tap, discard and wait for a fresh first tap.
- **Sanity range**: discard results outside 10–60 spm and show "missed?" briefly.
- **History strip**: last 6 readings with a small trend indicator (↑ ↓ →).
- **Log**: each reading is saved with timestamp, and with the active piece and crew if one is selected (optional crew chip above the pad). This is what makes rate data useful later.

## 3. Timers

Two independent stopwatches on one screen.

### 3a. Session clock (overall rowing time)
- Start / Pause / Resume. Pausing = a break.
- Shows: **rowing time** (big), plus small **total elapsed** and **break time**.
- "End session" (with confirm) saves the session to history.

### 3b. Piece clock
- Start / Stop / Reset, plus a **Split** button (records lap times; shows split and cumulative).
- Optional piece label (e.g. "3 × 500m #2") and target time; shows +/- against target.
- When stopped, the piece is saved to the current session with its splits.

## 4. Crews & prognostic times

### 4a. Prognostic table
- The app ships with **built-in default tables** for the **School** programme (Maadi grades) and the **Club** programme (NZ Championships grades). Which ones are active is set in Settings (§7): School, Club, or both.
- The coach can edit any row; edited rows are stored as **local overrides** on top of the default, with "Reset to default" per row or per table. A future app update can ship new defaults without wiping the coach's edits.
- Import from **CSV paste** (or file) to replace/merge. Columns: `program, boatClass, gender, grade, prognostic2k` where time is `m:ss.s`.
  Example: `school,8+,W,U17,6:45.0`
- Export back to CSV. The default tables live in `src/data/prognostics-default.csv` (generated from the coach's spreadsheet).

### 4b. Crews
- A crew has: name, boat class, gender, grade, optional **override prognostic** (for crews faster/slower than their grade), optional athlete list (seat → name).
- Prognostic time is looked up from the table by (boatClass, gender, grade) unless overridden. Show which source is used.
- **Quick add**: paste a list of crew lines (`Girls U17 8+ A, 8+, W, U17`) to create several at once. (Full crew-list paste with athletes is a later phase.)

## 5. Staggered-start pieces (the handicap feature)

Goal: crews of different speeds start at different times so they should **finish together**, and the coach can see each crew's own elapsed time during the piece.

### 5a. Setup
1. Pick crews for the piece (multi-select from saved crews).
2. Choose piece type: **Distance** (metres) or **Time** (mm:ss).
3. Choose prediction model: **Linear** (default) or **Paul's Law** (toggle).
4. App shows the start order and gaps, recalculated live as anything changes.
5. **Adjust any crew's time — this is a core interaction, not an edge case.** Not every crew is at its prog, and not every staggered piece is a prog session (often the goal is just to finish close together).
   - **Tap a crew row** → a bottom sheet opens with the crew's **working 2k time** in huge digits and a **scroll wheel / drum picker** to roll it up or down (0.5 s steps; fling for big changes), plus large `−1 s` `+1 s` `−5 s` `+5 s` buttons for wet-hands use. Shows the base it came from (`table` / `crew override`) and the delta (`+4.0 s`).
   - Optionally switch the sheet to **% of prog** (e.g. 97%) instead of seconds.
   - The adjustment is a **session adjustment**: it sticks for every piece for the rest of the session (so after a crew comes in slow on piece 1, piece 2 is already corrected). Buttons: `Apply to this session` (default), `Save to crew` (updates the crew's override permanently), `Reset to base`.
   - **Quick re-balance after a piece**: on the Results screen, each crew has `Use actual time` — sets the session adjustment so that crew's next prediction equals what it actually did. One tap per crew, then `Repeat piece`.
   - Mode toggle at the top of setup: **Prog** (times from table/overrides) or **Custom** (start from the last-used times or type gaps directly). Custom mode still uses the same adjust sheet.
6. Coach can also nudge an individual start gap directly (tap the gap). A nudged gap is shown with a marker so it's obvious it's no longer computed.

### 5b. Maths
Let `P` = crew's prognostic 2k time in seconds.

- **Linear predicted time** for distance `D`: `T = P × D / 2000`
- **Paul's Law** (+5 s per 500 m split for each doubling of distance):
  `split2k = P / 4`; `splitD = split2k + 5 × log2(D / 2000)`; `T = splitD × D / 500`
- **Start offsets**: slowest crew starts at 0. Each crew's offset = `T_slowest − T_crew`. Round to the nearest 0.5 s for display; keep exact values internally.
- **Time pieces**: convert to an equivalent distance using the fastest crew: `D = 2000 × duration / P_fastest` (linear), then apply the distance maths. The fastest crew rows the stated duration; slower crews row slightly longer but all aim to finish together. Show this explanation on the setup screen.

Worked example (1000 m, linear): A = 6:00 → 180 s, B = 6:30 → 195 s, C = 7:00 → 210 s.
Start order: C at 0:00, B at +0:15, A at +0:30. All predicted to finish at master 3:30.

### 5c. Live
- One **master clock** starts with the first (slowest) crew. Big "START" button.
- Each crew row shows: name, status (`waiting · 0:12 to go` → `GO!` → `rowing` → `finished`), and its **own elapsed time** (`master − offset`).
- **Start cues**: 5-second countdown on the next crew's row, vibration pattern + flash at GO.
- **Late start**: tapping a waiting/rowing crew's "Started" button records its *actual* start time and uses that instead of the planned offset (crews in a launch never start exactly on time).
- **Finish**: tap the crew row's FINISH button (large) to record its time. Show actual vs predicted (`−2.4 s` green = faster than prognostic, red = slower) and as % of prognostic speed.
- **Results** after all crews finish: table of actual time, predicted, difference, % of prognostic. Saved to the session. Each row has `Use actual time` (see §5a step 5), and the screen has `Repeat piece` (same crews, same distance, updated times).

## 6. Session log & notes (v1 = simple, local)

- **Session** = one outing: date, session clock data, pieces, stroke-rate log, notes.
- **Quick note** button available from Crews and from the session log: pick a crew (and optionally an athlete), pick tags, type or dictate text (use the phone keyboard's voice input — no custom speech code).
- **Tags** (editable): `technique`, `drill`, `worked`, `didn't work`, `combo`, `fitness`, `selection`.
- Notes are viewable per crew and per session.
- **Export to Markdown** (zip or share sheet): one file per session, with YAML frontmatter, laid out so it can be dropped into an Obsidian vault:

```markdown
---
date: 2026-11-05
type: session
crews: [Girls U17 8+ A, Boys U16 4x+]
tags: [drill, worked]
---
# Session 2026-11-05
## Pieces
| Piece | Crew | Time | Predicted | Diff |
...
## Notes
- **[[Girls U17 8+ A]]** #drill #worked — Pause at hands-away fixed the rush...
```

Crew and athlete names are written as `[[wikilinks]]` so Obsidian builds per-crew/athlete backlinks automatically.

## 7. Settings

Opened from the gear in the Crews header.

### 7a. Programme
- **Programme**: `School` · `Club` · `Both` (segmented control). Default on first run: ask.
- Determines which default prog tables are active, and which **grades** appear when creating a crew:
  - School: U15, U16, U17, U18, Novice (Maadi grades)
  - Club: Novice, Intermediate, Club, Senior, Premier (NZ Championships grades). Rough equivalents: Intermediate ≈ U16 (mostly 2nd-year rowers), Club ≈ a bit faster than U17, Senior (top amateur) ≈ a bit faster than U18, Premier = elite.
  - Both: all of the above, grouped by programme in pickers.
- Crews store their programme, so switching the setting never breaks existing crews.

### 7b. Prognostic tables
- Opens the table for each active programme: list grouped by grade → boat class, gender. Tap a row to edit (same drum picker as §5a). Edited rows show a dot; `Reset to default`.
- Import / export CSV (§4a).

### 7c. Appearance
- **Theme**: `Sun` (light, default) · `Dawn` (dark) · `Auto` (follow phone).
- **Accent colour**: 6 preset swatches (blue, orange, purple, teal, magenta, club-green) plus **custom** (hex / colour picker), so a club or school can use its own colours. The app checks contrast and warns if text on the accent would be hard to read in sunlight.
- **Go / Stop colours**: optional override (defaults green/red). Colour-blind-safe preset (blue/orange).
- **Text size**: Normal · Large · Extra large (scales the big readouts too).
- All appearance settings are CSS custom properties set on `:root`, so changing them never needs a rebuild.

### 7d. Other
- Stroke-rate defaults (stroke count, continuous mode, auto-reset seconds).
- Rounding for start gaps (0.5 s / 1 s).
- Haptics on/off. Keep screen awake on/off.
- Data: export everything (JSON backup), import backup, clear all data (double confirm).

## 8. Data model (TypeScript, stored in IndexedDB via Dexie)

```ts
type Ms = number; // epoch milliseconds

interface Stopwatch { startedAt: Ms | null; accumulatedMs: number; }
// elapsed = accumulatedMs + (startedAt ? Date.now() - startedAt : 0)

type Program = 'school' | 'club';
interface PrognosticRow { id: string; program: Program; boatClass: string; gender: 'M'|'W'; grade: string;
                          prog2kSec: number; isOverride?: boolean; defaultProg2kSec?: number; }
interface Crew { id: string; name: string; program: Program; boatClass: string; gender: 'M'|'W'; grade: string;
                 overrideProg2kSec?: number; athletes?: { seat: string; name: string }[]; archived?: boolean; }

interface Session { id: string; date: string; rowing: Stopwatch; startedAt: Ms; endedAt?: Ms;
                    crewAdjustments: Record<string /*crewId*/, { prog2kSec: number; source: 'manual'|'actual' }>; }
interface Settings { program: 'school'|'club'|'both'; theme: 'sun'|'dawn'|'auto'; accent: string;
                     goColor?: string; stopColor?: string; textScale: 1|1.15|1.3; gapRounding: 0.5|1;
                     rate: { strokes: 1|2|3; continuous: boolean; autoResetSec: number }; haptics: boolean; wakeLock: boolean; }
interface Piece { id: string; sessionId: string; label: string; kind: 'simple'|'staggered';
                  type: 'distance'|'time'; distanceM?: number; durationSec?: number; model: 'linear'|'paul';
                  masterStartAt?: Ms; entries: PieceEntry[]; splits?: Ms[]; }
interface PieceEntry { crewId: string; prog2kSec: number; predictedSec: number; plannedOffsetSec: number;
                       actualStartAt?: Ms; finishAt?: Ms; }
interface RateReading { id: string; sessionId: string; at: Ms; spm: number; strokes: 1|2|3; crewId?: string; pieceId?: string; }
interface Note { id: string; sessionId?: string; crewId?: string; athlete?: string; at: Ms; tags: string[]; text: string; }
```

Working 2k time for a crew in a piece = session adjustment ?? crew override ?? table row (active programme).

## 9. Later phases (not v1 — keep the design compatible)
- **Crew list paste with athletes**: paste a roster (from a spreadsheet) → crews + athletes created/updated.
- **Obsidian integration**: export straight into a vault folder structure (`Crews/`, `Athletes/`, `Sessions/`), possibly via a synced folder.
- **Multi-coach**: shared crews/prognostics/notes via a backend (e.g. Supabase) with per-coach accounts. Keep IDs as UUIDs and records timestamped (`updatedAt`) now so sync is possible later.
- **Native wrap (Capacitor)** if needed for: volume-button tapping for stroke rate, a persistent "timer running" notification, or more reliable background behaviour.
- Charts: stroke rate over a piece, crew performance vs prognostic over the season.
