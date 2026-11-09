import { useEffect, useMemo, useRef } from 'react';
import { useHaptics } from '../hooks/useHaptics';

interface Props {
  /** Every value on the drum, in order (e.g. 4:00.0 to 15:00.0 in 0.5 s steps). */
  values: number[];
  value: number;
  onChange: (value: number) => void;
  format: (value: number) => string;
  /** Read out by screen readers. */
  label: string;
}

/** Rows visible at once; the middle one is the chosen value. */
const VISIBLE = 3;
/** How long the drum has to be still before its value is taken (the browser's own snap finishes first). */
const SETTLE_MS = 120;

function nearestIndex(values: number[], value: number): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (Math.abs(values[i]! - value) < Math.abs(values[best]! - value)) best = i;
  return best;
}

/**
 * A scroll wheel: drag or fling it, and it snaps to a value. Built on native
 * scrolling with scroll-snap, so a fling glides like any list on the phone.
 * Also works with the arrow keys (it is a slider for screen readers).
 */
export function TimeDrumPicker({ values, value, onChange, format, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const haptics = useHaptics();
  const index = nearestIndex(values, value);
  /** Set while we scroll the drum ourselves, so that scroll isn't read back as a change. */
  const programmatic = useRef(false);
  const settleTimer = useRef<number | undefined>(undefined);

  const rows = useMemo(
    () =>
      values.map((v) => (
        <div key={v} className="time flex h-12 snap-center items-center justify-center text-3xl leading-none">
          {format(v)}
        </div>
      )),
    [values, format],
  );

  // Keep the drum on the value when it changes from outside (the ± buttons, typing).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rowHeight = el.scrollHeight / (values.length + VISIBLE - 1);
    const target = index * rowHeight;
    if (Math.abs(el.scrollTop - target) > rowHeight / 2) {
      programmatic.current = true;
      el.scrollTop = target;
      window.setTimeout(() => (programmatic.current = false), SETTLE_MS * 2);
    }
  }, [index, values.length]);

  useEffect(() => () => window.clearTimeout(settleTimer.current), []);

  const onScroll = () => {
    if (programmatic.current) return;
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const rowHeight = el.scrollHeight / (values.length + VISIBLE - 1);
      const next = Math.min(values.length - 1, Math.max(0, Math.round(el.scrollTop / rowHeight)));
      if (next !== index) {
        haptics.tap();
        onChange(values[next]!);
      }
    }, SETTLE_MS);
  };

  const step = (by: number) => {
    const next = Math.min(values.length - 1, Math.max(0, index + by));
    if (next !== index) onChange(values[next]!);
  };

  return (
    <div className="relative">
      {/* The band marking the chosen row. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-12 h-12 rounded-xl border-2 border-accent" />
      <div
        ref={ref}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={values[0]}
        aria-valuemax={values[values.length - 1]}
        aria-valuenow={values[index]}
        aria-valuetext={format(values[index]!)}
        onScroll={onScroll}
        onKeyDown={(event) => {
          const by = { ArrowUp: -1, ArrowDown: 1, PageUp: -10, PageDown: 10 }[event.key];
          if (by !== undefined) {
            event.preventDefault();
            step(by);
          }
        }}
        className="h-36 snap-y snap-mandatory overflow-y-scroll overscroll-contain rounded-xl bg-surface [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: 'linear-gradient(transparent, black 30%, black 70%, transparent)' }}
      >
        {/* Padding rows, so the first and last values can sit in the middle. */}
        <div aria-hidden="true" className="h-12" />
        <div aria-hidden="true">{rows}</div>
        <div aria-hidden="true" className="h-12" />
      </div>
    </div>
  );
}

/** Values from `min` to `max` in `step`s, without floating-point drift. */
export function range(min: number, max: number, step: number): number[] {
  const count = Math.round((max - min) / step);
  return Array.from({ length: count + 1 }, (_, i) => Math.round((min + i * step) * 1000) / 1000);
}
