import { useHaptics } from '../hooks/useHaptics';
import { formatProg } from '../lib/prognostic';
import { formatClock } from '../lib/time';
import type { Plan, PlanEntry } from '../lib/stagger';
import { TIME_SOURCE_LABEL, type CrewTime } from '../lib/stagger-setup';

/** `+0:15.0`: a start time after the first crew. */
export function formatOffset(sec: number): string {
  return `+${formatClock(Math.round(sec * 1000))}`;
}

interface Props {
  plan: Plan;
  times: CrewTime[];
  /** Setup: tap the start to nudge it, tap the crew to adjust its time. Ready: read only. */
  onNudge?: (entry: PlanEntry) => void;
  onAdjust?: (crewId: string) => void;
}

/** The start order, slowest first: each crew's start, gap to the crew before, time and prediction. */
export function StartList({ plan, times, onNudge, onAdjust }: Props) {
  const haptics = useHaptics();
  return (
    <ol className="flex flex-col gap-2" aria-label="Start order">
      {plan.entries.map((entry, index) => {
        const time = times.find((t) => t.crewId === entry.crewId);
        const previous = plan.entries[index - 1];
        const gap = previous ? entry.offsetSec - previous.offsetSec : null;
        const source = time ? TIME_SOURCE_LABEL[time.source] : '';

        const start = (
          <>
            <span className="time block text-2xl leading-tight">{formatOffset(entry.offsetSec)}</span>
            <span className="block text-sm font-semibold text-muted">
              {entry.nudged ? '✎ set by hand' : gap === null ? 'first away' : `gap ${gap.toFixed(1)} s`}
            </span>
          </>
        );
        const crew = (
          <>
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-lg font-bold">{entry.name}</span>
              <span className="time shrink-0 text-lg">{formatProg(entry.prog2kSec)}</span>
            </span>
            <span className="flex items-baseline justify-between gap-2 text-sm text-muted">
              <span className="truncate">{source}</span>
              <span className="shrink-0">
                rows <span className="time text-ink">{formatClock(Math.round(entry.predictedSec * 1000))}</span>
              </span>
            </span>
          </>
        );

        const box = 'min-h-primary rounded-xl bg-surface px-3 py-1 text-left';
        const nudgedBox = entry.nudged ? 'outline outline-2 outline-warn' : '';
        return (
          <li key={entry.crewId} className="grid grid-cols-[minmax(6.5rem,auto)_1fr] gap-2">
            {onNudge ? (
              <button
                type="button"
                aria-label={`${entry.name} starts ${formatOffset(entry.offsetSec)}${entry.nudged ? ', set by hand' : ''}. Change start.`}
                className={`${box} ${nudgedBox} active:opacity-70`}
                onClick={() => {
                  haptics.tap();
                  onNudge(entry);
                }}
              >
                {start}
              </button>
            ) : (
              <div className={`${box} ${nudgedBox}`}>{start}</div>
            )}
            {onAdjust ? (
              <button
                type="button"
                aria-label={`${entry.name} ${formatProg(entry.prog2kSec)} from ${source}. Adjust time.`}
                className={`${box} min-w-0 active:opacity-70`}
                onClick={() => {
                  haptics.tap();
                  onAdjust(entry.crewId);
                }}
              >
                {crew}
              </button>
            ) : (
              <div className={`${box} min-w-0`}>{crew}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
