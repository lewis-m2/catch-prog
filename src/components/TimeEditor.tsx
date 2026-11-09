import { useCallback, useState } from 'react';
import { MAX_PROG_SEC, MIN_PROG_SEC, formatProg, parseProg, roundProg } from '../lib/prognostic';
import { percentFromTime, timeFromPercent } from '../lib/stagger';
import { BigButton } from './BigButton';
import { Segmented } from './Segmented';
import { TimeDrumPicker, range } from './TimeDrumPicker';

const SECOND_STEPS = [-5, -1, 1, 5];
const PERCENT_STEPS = [-1, -0.5, 0.5, 1];
const TIMES = range(MIN_PROG_SEC, MAX_PROG_SEC, 0.5);
const PERCENTS = range(80, 115, 0.5);

type Unit = 'sec' | 'pct';

interface Props {
  /** 2k time in seconds. */
  value: number;
  onChange: (sec: number) => void;
  /** What the time is compared with, e.g. the table time. */
  base?: { sec: number; label: string };
  /** Offer "% of prog" (needs `base`): 97% = 3% slower in speed than the base. */
  allowPercent?: boolean;
}

const clampTime = (sec: number) => Math.min(MAX_PROG_SEC, Math.max(MIN_PROG_SEC, roundProg(sec)));
const formatPercent = (pct: number) => `${pct.toFixed(1)}%`;

/**
 * Edits a 2k time (SPEC §5a): huge digits, a drum to roll it (0.5 s steps, fling
 * for big changes), big ±1 s / ±5 s buttons for wet hands, or type it.
 */
export function TimeEditor({ value, onChange, base, allowPercent = false }: Props) {
  const [unit, setUnit] = useState<Unit>('sec');
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [invalid, setInvalid] = useState(false);
  const delta = base ? roundProg(value - base.sec) : 0;
  const percentMode = unit === 'pct' && base !== undefined;
  const pct = base ? percentFromTime(base.sec, value) : 100;

  const setTime = (sec: number) => onChange(clampTime(sec));
  const setPercent = useCallback((p: number) => base && onChange(clampTime(timeFromPercent(base.sec, p))), [base, onChange]);
  const formatTime = useCallback((sec: number) => formatProg(sec), []);

  const commit = () => {
    if (text.trim() === '') return setInvalid(false);
    const sec = parseProg(text);
    setInvalid(sec === null);
    if (sec !== null) {
      onChange(sec);
      setText('');
      setTyping(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {allowPercent && base && (
        <Segmented
          label="Adjust in"
          hideLabel
          options={[
            { value: 'sec' as Unit, label: 'Seconds' },
            { value: 'pct' as Unit, label: '% of prog' },
          ]}
          value={unit}
          onChange={setUnit}
        />
      )}

      <div className="text-center">
        <p className="time text-[min(5rem,22vw)] leading-none" aria-live="polite">
          {percentMode ? formatPercent(Math.round(pct * 10) / 10) : formatProg(value)}
        </p>
        {percentMode && <p className="time mt-1 text-2xl">= {formatProg(value)}</p>}
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

      {percentMode ? (
        <TimeDrumPicker key="pct" label="Percent of prognostic speed" values={PERCENTS} value={pct} onChange={setPercent} format={formatPercent} />
      ) : (
        <TimeDrumPicker key="sec" label="2k time" values={TIMES} value={value} onChange={setTime} format={formatTime} />
      )}

      <div className="grid grid-cols-4 gap-2">
        {(percentMode ? PERCENT_STEPS : SECOND_STEPS).map((by) => (
          <BigButton
            key={by}
            variant="secondary"
            size="primary"
            className="time px-1"
            onClick={() => (percentMode ? setPercent(Math.round((pct + by) * 10) / 10) : setTime(value + by))}
          >
            {by > 0 ? '+' : '−'}
            {Math.abs(by)}
            {percentMode ? '%' : ' s'}
          </BigButton>
        ))}
      </div>

      {typing ? (
        <label className="flex flex-col gap-1">
          <span className="text-base font-semibold text-muted">Type a time</span>
          <input
            value={text}
            autoFocus
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
      ) : (
        <BigButton variant="secondary" onClick={() => setTyping(true)}>
          Type a time…
        </BigButton>
      )}
    </div>
  );
}
