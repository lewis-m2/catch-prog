import { useState } from 'react';
import { MAX_PROG_SEC, MIN_PROG_SEC, formatProg, parseProg, roundProg } from '../lib/prognostic';
import { BigButton } from './BigButton';

const STEPS = [-5, -1, 1, 5];

interface Props {
  /** 2k time in seconds. */
  value: number;
  onChange: (sec: number) => void;
  /** What the time is compared with, e.g. the table time. */
  base?: { sec: number; label: string };
}

/**
 * Edits a 2k time: big ±1 s / ±5 s buttons for wet hands, or type it.
 * (Phase 4 adds the drum picker from SPEC §5a here.)
 */
export function TimeEditor({ value, onChange, base }: Props) {
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);
  const delta = base ? roundProg(value - base.sec) : 0;

  const step = (by: number) => onChange(Math.min(MAX_PROG_SEC, Math.max(MIN_PROG_SEC, roundProg(value + by))));

  const commit = () => {
    if (text.trim() === '') return setInvalid(false);
    const sec = parseProg(text);
    setInvalid(sec === null);
    if (sec !== null) {
      onChange(sec);
      setText('');
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="text-center">
        <p className="time text-[min(5rem,22vw)] leading-none" aria-live="polite">
          {formatProg(value)}
        </p>
        {base && (
          <p className="mt-1 text-lg text-muted">
            {base.label} <span className="time text-ink">{formatProg(base.sec)}</span>
            {delta !== 0 && (
              <span className="time text-ink">
                {' '}
                ({delta > 0 ? '+' : '−'}
                {Math.abs(delta).toFixed(1)} s {delta > 0 ? 'slower' : 'faster'})
              </span>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {STEPS.map((by) => (
          <BigButton key={by} variant="secondary" size="primary" className="time px-1" onClick={() => step(by)}>
            {by > 0 ? `+${by}` : `−${-by}`} s
          </BigButton>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-base font-semibold text-muted">Or type a time</span>
        <input
          value={text}
          inputMode="decimal"
          placeholder="m:ss.s"
          aria-invalid={invalid}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
          className={`time min-h-control w-full rounded-xl border-2 bg-bg px-3 text-lg ${invalid ? 'border-stop' : 'border-surface'}`}
        />
        {invalid && <span className="text-base font-bold text-stop">Use m:ss.s, between 4:00 and 15:00</span>}
      </label>
    </div>
  );
}
