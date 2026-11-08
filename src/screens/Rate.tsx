import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { BigButton } from '../components/BigButton';
import { Sheet } from '../components/Sheet';
import { saveRateReading } from '../db/rate-readings';
import { useCrews } from '../hooks/useData';
import { useHaptics } from '../hooks/useHaptics';
import { useNow } from '../hooks/useNow';
import { formatSpm, isExpired, STROKE_COUNTS, tap, trend, type RateOptions, type Trend } from '../lib/rate';
import { isRunning, tapTime } from '../lib/time';
import { useSettings } from '../state/settings';
import { useTimers } from '../state/timers';

const HISTORY_LENGTH = 6;
const MISSED_SHOW_MS = 1500;

const TREND_TEXT: Record<Trend, { arrow: string; label: string }> = {
  up: { arrow: '↑', label: 'up' },
  down: { arrow: '↓', label: 'down' },
  steady: { arrow: '→', label: 'steady' },
};

// The pad acts on touch-down, which is earlier than a click (that waits for the
// finger to lift), and `tapTime` corrects for any delay before the handler runs.

export function Rate() {
  const haptics = useHaptics();
  const rateSettings = useSettings((state) => state.rate);
  const setStrokes = useSettings((state) => state.setRateStrokes);
  const crewId = useSettings((state) => state.rateCrewId);
  const crews = useCrews();
  // A deleted crew simply drops off the chip.
  const crew = crews?.find((c) => c.id === crewId);
  const [pickingCrew, setPickingCrew] = useState(false);
  const options: RateOptions = {
    strokes: rateSettings.strokes,
    continuous: rateSettings.continuous,
    autoResetMs: rateSettings.autoResetSec * 1000,
  };

  /** Time of the tap that started the current measurement, or null. */
  const [startedAt, setStartedAt] = useState<number | null>(null);
  /** Newest first. */
  const [readings, setReadings] = useState<number[]>([]);
  const [missedAt, setMissedAt] = useState<number | null>(null);

  // Ticks for the live seconds count, the 10 s auto-reset and hiding "missed?".
  const now = useNow();
  const timing = startedAt !== null && !isExpired(startedAt, now, options);
  const missedVisible = missedAt !== null && now - missedAt < MISSED_SHOW_MS;

  const onTap = (at: number) => {
    haptics.tap();
    const result = tap(startedAt, at, options);
    setStartedAt(result.startedAt);

    const { outcome } = result;
    if (outcome.kind === 'missed') {
      setMissedAt(at);
    } else if (outcome.kind === 'reading') {
      setMissedAt(null);
      setReadings((previous) => [outcome.spm, ...previous].slice(0, HISTORY_LENGTH));
      // Linked to the session and to the piece if one is running, so the log shows rate per piece.
      const { session, piece } = useTimers.getState();
      saveRateReading({
        at: Math.round(at),
        spm: outcome.spm,
        strokes: options.strokes,
        sessionId: session?.id,
        crewId: crew?.id,
        pieceId: piece && isRunning(piece.clock) ? piece.id : undefined,
      }).catch((error: unknown) => console.error('Could not save rate reading', error));
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) return; // ignore a second finger or a wet palm
    onTap(tapTime(event.timeStamp));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
      event.preventDefault();
      onTap(tapTime(event.timeStamp));
    }
  };

  const latest = readings[0];
  const previous = readings[1];
  const change = latest !== undefined && previous !== undefined ? latest - previous : undefined;
  const direction = latest !== undefined && previous !== undefined ? trend(previous, latest) : undefined;
  // Clamped: the display clock can lag a tap by a frame.
  const elapsedSec = timing && startedAt !== null ? Math.max(0, now - startedAt) / 1000 : 0;

  return (
    <div className="flex h-full flex-col gap-3">
      <BigButton
        variant="secondary"
        aria-label={`Crew: ${crew ? crew.name : 'none'}. Change crew.`}
        className="flex items-center justify-between gap-2 text-left"
        onClick={() => setPickingCrew(true)}
      >
        <span className="truncate">
          <span className="font-semibold text-muted">Crew </span>
          {crew ? crew.name : 'none'}
        </span>
        <span aria-hidden="true" className="text-muted">
          ▾
        </span>
      </BigButton>
      {pickingCrew && (
        <CrewPicker
          selectedId={crew?.id ?? null}
          crews={crews ?? []}
          onPick={(id) => {
            useSettings.getState().update({ rateCrewId: id });
            setPickingCrew(false);
          }}
          onClose={() => setPickingCrew(false)}
        />
      )}
      <div role="group" aria-label="Strokes per measurement" className="flex items-center gap-2">
        <span className="pr-1 text-lg font-bold text-muted">Strokes</span>
        {STROKE_COUNTS.map((count) => {
          const selected = count === options.strokes;
          return (
            <BigButton
              key={count}
              variant={selected ? 'primary' : 'secondary'}
              aria-pressed={selected}
              aria-label={`${count} stroke${count === 1 ? '' : 's'}`}
              className="min-h-primary flex-1 text-2xl"
              onClick={() => {
                setStrokes(count);
                setStartedAt(null); // a half-finished measurement no longer applies
              }}
            >
              {selected ? `✓ ${count}` : count}
            </BigButton>
          );
        })}
      </div>

      <div className="flex items-end justify-between gap-2">
        <p aria-live="polite" aria-atomic="true">
          <span className="time text-[min(6rem,26vw)] leading-none">{latest !== undefined ? formatSpm(latest) : '––.–'}</span>
          <span className="ml-2 text-xl font-bold text-muted">spm</span>
        </p>
        {direction && change !== undefined && (
          <p className="time pb-2 text-2xl" aria-label={`Trend ${TREND_TEXT[direction].label}, ${formatSpm(Math.abs(change))}`}>
            {TREND_TEXT[direction].arrow} {change >= 0 ? '+' : '−'}
            {formatSpm(Math.abs(change))}
          </p>
        )}
      </div>

      {/* Fixed height, so nothing below (especially the pad) moves when it appears. */}
      <div className="flex h-12 items-center gap-2">
        {missedVisible ? (
          <p role="alert" className="rounded-lg bg-warn px-3 py-1 text-xl font-extrabold text-black">
            missed? tap again
          </p>
        ) : (
          <ol aria-label="Recent readings, newest first" className="flex gap-2">
            {readings.map((spm, index) => (
              <li
                key={readings.length - index}
                className={`time rounded-lg bg-surface px-2 py-1 text-xl ${index === 0 ? '' : 'text-muted'}`}
              >
                {formatSpm(spm)}
              </li>
            ))}
          </ol>
        )}
      </div>

      <button
        type="button"
        onPointerDown={onPointerDown}
        onKeyDown={onKeyDown}
        // touch-none: no scrolling or zooming, so every touch is a tap.
        // Black on green: white on green is too faint in sunlight.
        className={`flex min-h-[50%] flex-1 touch-none select-none flex-col items-center justify-center gap-2 rounded-2xl active:brightness-90 ${
          timing ? 'bg-go text-on-go' : 'bg-accent text-on-accent'
        }`}
      >
        <span className="text-4xl font-extrabold">{timing ? 'Tap again at the catch' : 'Tap at the catch'}</span>
        <span className="time text-2xl font-semibold">
          {timing
            ? `${options.strokes} stroke${options.strokes === 1 ? '' : 's'} · ${elapsedSec.toFixed(1)} s`
            : `then again ${options.strokes} stroke${options.strokes === 1 ? '' : 's'} later`}
        </span>
      </button>
    </div>
  );
}

function CrewPicker({
  crews,
  selectedId,
  onPick,
  onClose,
}: {
  crews: { id: string; name: string }[];
  selectedId: string | null;
  onPick: (id: string | null) => void;
  onClose: () => void;
}) {
  const options = [{ id: null, name: 'No crew' }, ...crews];
  return (
    <Sheet title="Readings are for" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const selected = option.id === selectedId;
          return (
            <BigButton
              key={option.id ?? 'none'}
              variant={selected ? 'primary' : 'secondary'}
              size="primary"
              aria-pressed={selected}
              className="text-left"
              onClick={() => onPick(option.id)}
            >
              {selected ? `✓ ${option.name}` : option.name}
            </BigButton>
          );
        })}
        {crews.length === 0 && <p className="text-lg text-muted">Add crews on the Crews tab.</p>}
      </div>
    </Sheet>
  );
}
