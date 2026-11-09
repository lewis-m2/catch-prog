import { useState } from 'react';
import { roundTo, type PlanEntry } from '../lib/stagger';
import { useSettings } from '../state/settings';
import { useStagger } from '../state/stagger';
import { BigButton } from './BigButton';
import { Sheet } from './Sheet';
import { formatOffset } from './StartList';

const STEPS = [-1, -0.5, 0.5, 1];

/**
 * Tap a crew's start time (SPEC §5a step 6): move it by hand. A nudged start is
 * marked in the list so it's obvious it is no longer worked out from the times.
 */
export function StartSheet({ entry, shiftSec, onClose }: { entry: PlanEntry; shiftSec: number; onClose: () => void }) {
  const [value, setValue] = useState(entry.offsetSec);
  const rounding = useSettings((state) => state.gapRounding);
  const computed = Math.max(0, roundTo(entry.exactOffsetSec, rounding) - shiftSec);
  const { setNudge } = useStagger.getState();

  return (
    <Sheet title={`${entry.name}: start`} onClose={onClose}>
      <div className="text-center">
        <p className="time text-[min(5rem,22vw)] leading-none" aria-live="polite">
          {formatOffset(value)}
        </p>
        <p className="mt-1 text-lg text-muted">
          after the first crew · worked out <span className="time text-ink">{formatOffset(computed)}</span>
        </p>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {STEPS.map((by) => (
          <BigButton key={by} variant="secondary" size="primary" className="time px-1" onClick={() => setValue((v) => Math.max(0, v + by))}>
            {by > 0 ? '+' : '−'}
            {Math.abs(by)} s
          </BigButton>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <BigButton
          variant="go"
          onClick={() => {
            setNudge(entry.crewId, value + shiftSec);
            onClose();
          }}
        >
          Start at {formatOffset(value)}
        </BigButton>
        {entry.nudged && (
          <BigButton
            variant="secondary"
            onClick={() => {
              setNudge(entry.crewId, null);
              onClose();
            }}
          >
            Back to worked out
          </BigButton>
        )}
      </div>
    </Sheet>
  );
}
