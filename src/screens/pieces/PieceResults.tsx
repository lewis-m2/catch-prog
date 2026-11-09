import { BigButton } from '../../components/BigButton';
import type { StaggeredPiece, StaggerEntry } from '../../db/types';
import { formatProg } from '../../lib/prognostic';
import { crewResult, MODEL_LABEL, nextProgFromActual } from '../../lib/stagger';
import { describePiece } from '../../lib/stagger-piece';
import { formatClock } from '../../lib/time';
import { useStagger } from '../../state/stagger';
import { useTimers } from '../../state/timers';
import { ResultLine } from './PieceLive';

/** Results (SPEC §5c): actual vs predicted for each crew, Use actual time, Repeat piece. */
export function PieceResults({ piece }: { piece: StaggeredPiece }) {
  const { repeat, newPiece, reopen } = useStagger.getState();
  const finished = piece.entries.filter((entry) => entry.finishAt !== undefined).length;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-3xl font-extrabold">Results</h1>
        <p className="text-lg text-muted">
          {describePiece(piece)} · {MODEL_LABEL[piece.model]} · ✓ saved to this session
        </p>
      </div>

      <ol className="flex flex-col gap-2" aria-label="Results">
        {piece.entries.map((entry) => (
          <ResultRow key={entry.crewId} piece={piece} entry={entry} />
        ))}
      </ol>

      <p className="text-base text-muted">
        <span className="font-bold text-ink">Use actual time</span> sets that crew’s time for the rest of the session, so
        its next prediction matches what it just did.
      </p>

      <BigButton variant="go" onClick={repeat}>
        Repeat piece
      </BigButton>
      <BigButton variant="secondary" size="primary" onClick={newPiece}>
        New piece
      </BigButton>
      <BigButton variant="secondary" onClick={reopen}>
        {finished === piece.entries.length ? 'Back to the piece (fix a finish)' : 'Back to the piece'}
      </BigButton>
    </div>
  );
}

function ResultRow({ piece, entry }: { piece: StaggeredPiece; entry: StaggerEntry }) {
  const result = crewResult(entry, piece.startedAt, piece.calcDistanceM, piece.model);
  const adjustment = useTimers((state) => state.session?.crewAdjustments[entry.crewId]);
  const custom = useStagger((state) => state.custom[entry.crewId]);
  const next = result ? nextProgFromActual(result.actualSec, piece.calcDistanceM, piece.model) : null;
  const applied = next !== null && (piece.mode === 'custom' ? custom === next : adjustment?.prog2kSec === next);

  const useActual = () => {
    if (next === null) return;
    if (piece.mode === 'custom') useStagger.getState().setCustom(entry.crewId, next);
    else useStagger.getState().setAdjustment(entry.crewId, { prog2kSec: next, source: 'actual' });
  };

  return (
    <li className="flex flex-col gap-2 rounded-xl bg-surface p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-xl font-bold">{entry.crewName}</span>
        <span className="time shrink-0 text-3xl">{result ? formatClock(result.actualSec * 1000) : '—'}</span>
      </div>
      {result ? (
        <>
          <p className="text-base text-muted">
            Planned <span className="time text-ink">{formatClock(Math.round(entry.predictedSec * 1000))}</span> on{' '}
            <span className="time text-ink">{formatProg(entry.prog2kSec)}</span>
          </p>
          <ResultLine diffSec={result.diffSec} pct={result.pctOfProg} />
          {applied ? (
            <p className="flex min-h-control items-center text-lg font-bold">✓ Next piece uses {formatProg(next)}</p>
          ) : (
            <BigButton variant="primary" size="control" onClick={useActual}>
              Use actual time · {formatProg(next!)}
            </BigButton>
          )}
        </>
      ) : (
        <p className="text-lg font-bold">No finish time</p>
      )}
    </li>
  );
}
