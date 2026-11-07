import { useState, type KeyboardEvent, type PointerEvent } from 'react';
import { BigButton } from '../components/BigButton';
import { saveRateReading } from '../db/rate-readings';
import { useHaptics } from '../hooks/useHaptics';
import { useNow } from '../hooks/useNow';
import { formatSpm, isExpired, STROKE_COUNTS, tap, trend, type RateOptions, type Trend } from '../lib/rate';
import { useSettings } from '../state/settings';

const HISTORY_LENGTH = 6;
const MISSED_SHOW_MS = 1500;

const TREND_TEXT: Record<Trend, { arrow: string; label: string }> = {
  up: { arrow: '↑', label: 'up' },
  down: { arrow: '↓', label: 'down' },
  steady: { arrow: '→', label: 'steady' },
};

/**
 * When the finger touched the screen, as epoch ms. `event.timeStamp` is
 * recorded at the moment of input, so it is more accurate than reading the
 * clock in the handler, and touching down is earlier than a click (which waits
 * for the finger to lift).
 */
const tapTime = (event: { timeStamp: number }) => performance.timeOrigin + event.timeStamp;

export function Rate() {
  const haptics = useHaptics();
  const rateSettings = useSettings((state) => state.rate);
  const setStrokes = useSettings((state) => state.setRateStrokes);
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
      saveRateReading({ at: Math.round(at), spm: outcome.spm, strokes: options.strokes }).catch((error: unknown) =>
        console.error('Could not save rate reading', error),
      );
    }
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary) return; // ignore a second finger or a wet palm
    onTap(tapTime(event));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
      event.preventDefault();
      onTap(tapTime(event));
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
          <span className="time text-[96px] leading-none">{latest !== undefined ? formatSpm(latest) : '––.–'}</span>
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
          timing ? 'bg-go text-black' : 'bg-accent text-white'
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
