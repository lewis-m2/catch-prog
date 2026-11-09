import { useState } from 'react';
import { saveCrew } from '../db/crews';
import type { Crew } from '../db/types';
import { formatProg, PROG_SOURCE_LABEL } from '../lib/prognostic';
import type { StaggerMode } from '../lib/stagger';
import { TIME_SOURCE_LABEL, type CrewTime } from '../lib/stagger-setup';
import { useStagger } from '../state/stagger';
import { useTimers } from '../state/timers';
import { BigButton } from './BigButton';
import { Sheet } from './Sheet';
import { TimeEditor } from './TimeEditor';

/** Used when a crew has no time at all: a middling 2k to start the drum from. */
const FALLBACK_SEC = 420;

/**
 * Tap a crew in the setup (SPEC §5a step 5): roll its 2k time up or down.
 * Prog mode saves a session adjustment (it sticks for every piece this session);
 * Custom mode sets the time for this setup only. Either can be saved to the crew.
 */
export function CrewTimeSheet({ crew, time, mode, onClose }: { crew: Crew; time: CrewTime; mode: StaggerMode; onClose: () => void }) {
  const [value, setValue] = useState(time.sec ?? time.base.sec ?? FALLBACK_SEC);
  const hasSession = useTimers((state) => state.session !== null);
  const { setAdjustment, setCustom } = useStagger.getState();
  const base = time.base.sec !== null ? { sec: time.base.sec, label: time.base.source === 'crew' ? 'Crew override' : 'Table' } : undefined;
  const isBase = base !== undefined && Math.abs(value - base.sec) < 0.05;

  const close = (action: () => void) => () => {
    action();
    onClose();
  };

  const applyToSession = close(() =>
    // Rolling back to the crew's own time is the same as having no adjustment.
    setAdjustment(crew.id, isBase ? null : { prog2kSec: value, source: 'manual' }),
  );
  const useForPiece = close(() => setCustom(crew.id, value));
  const saveToCrew = close(() => {
    void saveCrew({ ...crew, overrideProg2kSec: value });
    // The crew's time is now its own, so this session follows it.
    setAdjustment(crew.id, null);
    if (mode === 'custom') setCustom(crew.id, null);
  });
  const reset = close(() => (mode === 'custom' ? setCustom(crew.id, null) : setAdjustment(crew.id, null)));

  const showReset = mode === 'custom' ? time.source === 'custom' || time.source === 'last' : time.adjustment !== undefined;

  return (
    <Sheet title={crew.name} onClose={onClose}>
      <p className="mb-3 text-lg text-muted">
        Now{' '}
        <span className="time text-ink">{time.sec !== null ? formatProg(time.sec) : '—'}</span> from{' '}
        {TIME_SOURCE_LABEL[time.source]}
        {time.base.source === 'none' && ' (no table row for this crew)'}
      </p>

      <TimeEditor value={value} onChange={setValue} base={base} allowPercent />

      <div className="mt-4 flex flex-col gap-2">
        {mode === 'prog' ? (
          <BigButton variant="go" onClick={applyToSession}>
            Apply to this session · {formatProg(value)}
          </BigButton>
        ) : (
          <BigButton variant="go" onClick={useForPiece}>
            Use for this piece · {formatProg(value)}
          </BigButton>
        )}
        {mode === 'prog' && !hasSession && (
          <p className="text-base text-muted">No session yet: it joins the session when you START.</p>
        )}
        <BigButton variant="secondary" onClick={saveToCrew}>
          Save to crew (permanent)
        </BigButton>
        {showReset && (
          <BigButton variant="secondary" onClick={reset}>
            {mode === 'custom'
              ? 'Back to the prog time'
              : base
                ? `Reset to ${PROG_SOURCE_LABEL[time.base.source]} ${formatProg(base.sec)}`
                : 'Remove the adjustment'}
          </BigButton>
        )}
      </div>
    </Sheet>
  );
}
