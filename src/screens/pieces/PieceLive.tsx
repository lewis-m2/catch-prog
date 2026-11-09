import { BigButton } from '../../components/BigButton';
import { ConfirmButton } from '../../components/ConfirmButton';
import { formatOffset } from '../../components/StartList';
import { TimingButton } from '../../components/TimingButton';
import type { StaggeredPiece, StaggerEntry } from '../../db/types';
import { useNow } from '../../hooks/useNow';
import { countdownNumber, crewResult, crewStartAt, crewStatus, formatDiff } from '../../lib/stagger';
import { describePiece, predictedFinishMs } from '../../lib/stagger-piece';
import { formatClock } from '../../lib/time';
import { useStagger } from '../../state/stagger';

/** The live piece (SPEC §5c): master clock, and a row per crew with its own time. */
export function PieceLive({ piece }: { piece: StaggeredPiece }) {
  const now = useNow(true);
  const { endPiece, cancel } = useStagger.getState();
  const masterMs = Math.max(0, now - piece.startedAt);
  const timeUp = piece.type === 'time' && masterMs >= predictedFinishMs(piece);
  // The next crew to go gets the countdown.
  const next = piece.entries.find((entry) => entry.actualStartAt === undefined && now < crewStartAt(entry, piece.startedAt));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-lg font-bold text-muted">{describePiece(piece)}</p>
        <p className="time text-[min(4.5rem,24vw)] leading-none" aria-label={`Master clock ${formatClock(masterMs)}`}>
          {formatClock(masterMs)}
        </p>
      </div>

      {timeUp && (
        <p role="alert" className="rounded-xl bg-warn p-3 text-2xl font-extrabold text-black">
          TIME! Every crew’s time is up.
        </p>
      )}

      <ol className="flex flex-col gap-2" aria-label="Crews">
        {piece.entries.map((entry) => (
          <LiveCrew key={entry.crewId} piece={piece} entry={entry} now={now} isNext={entry === next} />
        ))}
      </ol>

      <div className="mt-2 flex flex-col gap-3 border-t-2 border-surface pt-4">
        <ConfirmButton
          label="End piece now"
          question="End the piece? Crews without a finish get no time."
          confirmLabel="End piece"
          onConfirm={() => endPiece(Date.now())}
        />
        <ConfirmButton
          label="Cancel piece"
          question="Delete this piece and go back to the start list?"
          confirmLabel="Delete piece"
          onConfirm={cancel}
        />
      </div>
    </div>
  );
}

function LiveCrew({ piece, entry, now, isNext }: { piece: StaggeredPiece; entry: StaggerEntry; now: number; isNext: boolean }) {
  const { markStarted, clearStart, finish, undoFinish } = useStagger.getState();
  const status = crewStatus(entry, piece.startedAt, now);
  const countdown = status.kind === 'waiting' && isNext ? countdownNumber(status.toGoMs) : null;
  const result = status.kind === 'finished' ? crewResult(entry, piece.startedAt, piece.calcDistanceM, piece.model) : null;

  const card =
    status.kind === 'go'
      ? 'bg-go text-on-go'
      : countdown !== null
        ? 'bg-surface outline outline-4 outline-warn'
        : status.kind === 'finished'
          ? 'border-2 border-surface'
          : 'bg-surface';

  let big: string;
  let line: string;
  switch (status.kind) {
    case 'waiting':
      big = countdown !== null ? String(countdown) : formatClock(status.toGoMs, { tenths: false });
      line = `${countdown !== null ? '' : 'to go · '}starts ${formatOffset(entry.offsetSec)}`;
      break;
    case 'go':
      big = 'GO!';
      line = 'just started';
      break;
    case 'rowing':
      big = formatClock(status.elapsedMs);
      line = entry.actualStartAt !== undefined ? 'rowing · start set by tap' : 'rowing';
      break;
    case 'finished':
      big = formatClock(status.timeMs);
      line = 'finished';
      break;
  }

  return (
    <li
      aria-label={`${entry.crewName}: ${status.kind === 'go' ? 'GO' : line}`}
      className={`grid grid-cols-[1fr_minmax(8.5rem,45%)] items-center gap-3 rounded-xl p-3 ${card}`}
    >
      <div className="min-w-0">
        <p className="truncate text-xl font-bold">{entry.crewName}</p>
        <p className={`time leading-none ${countdown !== null || status.kind === 'go' ? 'text-5xl' : 'text-4xl'}`}>
          {big}
        </p>
        <p className={`text-base ${status.kind === 'go' ? 'font-bold' : 'text-muted'}`}>{line}</p>
        {result && <ResultLine diffSec={result.diffSec} pct={result.pctOfProg} />}
        {entry.actualStartAt !== undefined && status.kind !== 'finished' && (
          <BigButton variant="outline" className="mt-1 px-3 text-base" onClick={() => clearStart(entry.crewId)}>
            Use planned start
          </BigButton>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {status.kind === 'waiting' && (
          <TimingButton variant="outline" aria-label={`${entry.crewName} started`} onPress={(at) => markStarted(entry.crewId, at)}>
            Started
          </TimingButton>
        )}
        {(status.kind === 'go' || status.kind === 'rowing') && (
          <>
            <TimingButton
              variant="stop"
              height="hero"
              aria-label={`${entry.crewName} finish`}
              onPress={(at) => finish(entry.crewId, at)}
            >
              FINISH
            </TimingButton>
            <TimingButton
              variant="outline"
              height="control"
              aria-label={`${entry.crewName} started now (late start)`}
              onPress={(at) => markStarted(entry.crewId, at)}
            >
              Started
            </TimingButton>
          </>
        )}
        {status.kind === 'finished' && (
          <BigButton variant="outline" aria-label={`Undo ${entry.crewName} finish`} onClick={() => undoFinish(entry.crewId)}>
            Undo finish
          </BigButton>
        )}
      </div>
    </li>
  );
}

/** `−2.4 s faster · 101.2% of prog`: colour plus sign and words, never colour alone. */
export function ResultLine({ diffSec, pct }: { diffSec: number; pct: number | null }) {
  const tenths = Math.round(diffSec * 10) / 10;
  const faster = tenths < 0;
  const badge = tenths === 0 ? 'bg-surface text-ink' : faster ? 'bg-go text-on-go' : 'bg-stop text-on-stop';
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-base">
      <span className={`time rounded-md px-2 py-0.5 ${badge}`}>
        {formatDiff(diffSec)} {tenths === 0 ? 'on plan' : faster ? 'faster' : 'slower'}
      </span>
      {pct !== null && (
        <span>
          <span className="time">{pct.toFixed(1)}%</span> of prog
        </span>
      )}
    </p>
  );
}
