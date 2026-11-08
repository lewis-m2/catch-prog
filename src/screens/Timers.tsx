import { ConfirmButton } from '../components/ConfirmButton';
import { TimingButton } from '../components/TimingButton';
import { useNow } from '../hooks/useNow';
import { sessionTimes, splitRows } from '../lib/session';
import { elapsedMs, formatClock, isRunning } from '../lib/time';
import type { WakeLockStatus } from '../lib/wake-lock';
import { useTimers } from '../state/timers';

export function Timers({ wakeLock }: { wakeLock: WakeLockStatus }) {
  const session = useTimers((state) => state.session);
  const piece = useTimers((state) => state.piece);
  const pieceRunning = piece !== null && isRunning(piece.clock);
  // Ticks while a session exists: break time grows even while rowing is paused.
  const now = useNow(session !== null || pieceRunning);
  const screenMaySleep = session !== null && (wakeLock === 'failed' || wakeLock === 'unsupported');

  // Order matters: the controls used mid-piece must fit without scrolling,
  // and End session sits at the bottom, away from them.
  return (
    <div className="flex flex-col gap-5">
      {screenMaySleep && (
        <p role="alert" className="rounded-lg bg-warn px-3 py-1 text-base font-bold text-black">
          Screen may turn off: the phone refused to keep it awake.
        </p>
      )}
      <SessionSection now={now} />
      <PieceSection now={now} />
      {session && (
        <div className="border-t-2 border-surface pt-4">
          <ConfirmButton
            label="End session"
            question="End this session? It will be saved and the clocks reset."
            confirmLabel="End session"
            onConfirm={() => useTimers.getState().endSession(Date.now())}
          />
        </div>
      )}
    </div>
  );
}

function SessionSection({ now }: { now: number }) {
  const session = useTimers((state) => state.session);
  const { startSession, pauseSession } = useTimers.getState();
  const rowing = session !== null && isRunning(session.rowing);
  const times = session ? sessionTimes(session, now) : { rowingMs: 0, totalMs: 0, breakMs: 0 };

  return (
    <section aria-labelledby="session-heading" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h1 id="session-heading" className="text-2xl font-extrabold">
          Session
        </h1>
        <span className="text-lg font-bold text-muted">{!session ? 'Not started' : rowing ? 'Rowing' : 'On a break'}</span>
      </div>

      <div>
        <p className="time text-[min(4.5rem,24vw)] leading-none" aria-label={`Rowing time ${formatClock(times.rowingMs, { tenths: false })}`}>
          {formatClock(times.rowingMs, { tenths: false })}
        </p>
        <p className="mt-1 text-lg text-muted">
          Total <span className="time text-ink">{formatClock(times.totalMs, { tenths: false })}</span> · Break{' '}
          <span className="time text-ink">{formatClock(times.breakMs, { tenths: false })}</span>
        </p>
      </div>

      {!session && (
        <TimingButton variant="go" onPress={startSession}>
          Start session
        </TimingButton>
      )}
      {session && rowing && (
        <TimingButton variant="secondary" onPress={pauseSession}>
          Pause for a break
        </TimingButton>
      )}
      {session && !rowing && (
        <TimingButton variant="go" onPress={startSession}>
          Resume rowing
        </TimingButton>
      )}
    </section>
  );
}

function PieceSection({ now }: { now: number }) {
  const piece = useTimers((state) => state.piece);
  const details = useTimers((state) => state.details);
  const { startPiece, splitPiece, stopPiece, undoStopPiece, resetPiece, setDetails } = useTimers.getState();
  const running = piece !== null && isRunning(piece.clock);
  const pieceMs = piece ? elapsedMs(piece.clock, now) : 0;
  const rows = piece ? splitRows(piece.splitsMs, running ? undefined : pieceMs) : [];

  return (
    <section aria-labelledby="piece-heading" className="flex flex-col gap-3 border-t-2 border-surface pt-4">
      <h2 id="piece-heading" className="text-2xl font-extrabold">
        Piece
      </h2>

      <label className="flex flex-col gap-1">
        <span className="text-base font-semibold text-muted">Label (optional)</span>
        <input
          value={details.label}
          onChange={(event) => setDetails({ label: event.target.value })}
          placeholder="e.g. 3 × 500m #2"
          className="min-h-control w-full rounded-xl border-2 border-surface bg-bg px-3 text-lg"
        />
      </label>

      <p className="time text-[min(5rem,25vw)] leading-none">{formatClock(pieceMs)}</p>

      {!piece && (
        <TimingButton variant="go" onPress={startPiece}>
          Start piece
        </TimingButton>
      )}
      {piece && running && (
        <div className="flex gap-2">
          <TimingButton variant="primary" className="flex-1" onPress={splitPiece}>
            Split
          </TimingButton>
          <TimingButton variant="stop" className="flex-1" onPress={stopPiece}>
            Stop
          </TimingButton>
        </div>
      )}
      {piece && !running && (
        <>
          <p className="text-lg font-bold">✓ Saved to this session</p>
          <div className="flex gap-2">
            <TimingButton variant="secondary" className="flex-1" onPress={() => undoStopPiece()}>
              Undo stop
            </TimingButton>
            <TimingButton variant="primary" className="flex-1" onPress={() => resetPiece()}>
              Reset
            </TimingButton>
          </div>
        </>
      )}

      {rows.length > 0 && (
        <table className="time w-full text-xl">
          <thead>
            <tr className="text-left text-base text-muted">
              <th className="py-1 font-semibold">Split</th>
              <th className="py-1 font-semibold">Lap</th>
              <th className="py-1 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {[...rows].reverse().map((row) => (
              <tr key={row.label} className="border-t border-surface">
                <td className="py-2">{row.label}</td>
                <td className="py-2">{formatClock(row.lapMs)}</td>
                <td className="py-2 text-muted">{formatClock(row.totalMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
