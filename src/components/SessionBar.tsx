import { useNavigate } from 'react-router-dom';
import { useHaptics } from '../hooks/useHaptics';
import { useNow } from '../hooks/useNow';
import { sessionTimes } from '../lib/session';
import { elapsedMs, formatClock, isRunning } from '../lib/time';
import { useTimers } from '../state/timers';

/** Always on screen: the rowing clock, and the piece clock while a piece is running. Tap to open Timers. */
export function SessionBar() {
  const navigate = useNavigate();
  const haptics = useHaptics();
  const session = useTimers((state) => state.session);
  const piece = useTimers((state) => state.piece);
  const pieceRunning = piece !== null && isRunning(piece.clock);
  const now = useNow(session !== null);

  const status = !session ? 'No session' : isRunning(session.rowing) ? 'Rowing' : 'Break';
  const rowing = session ? formatClock(sessionTimes(session, now).rowingMs, { tenths: false }) : '0:00';
  const pieceTime = pieceRunning ? formatClock(elapsedMs(piece.clock, now)) : null;

  return (
    <button
      type="button"
      aria-label={`${status} ${session ? rowing : ''}${pieceTime ? `, piece ${pieceTime}` : ''}. Open Timers.`}
      className="flex w-full shrink-0 items-center justify-between gap-3 border-b-2 border-surface bg-bg px-4 pt-[env(safe-area-inset-top)] text-left active:opacity-70"
      onClick={() => {
        haptics.tap();
        navigate('/timers');
      }}
    >
      <span className="flex h-14 items-baseline gap-2">
        <span className="self-center text-base font-semibold text-muted">{status}</span>
        {session && <span className="time self-center text-3xl">{rowing}</span>}
      </span>
      {pieceTime && (
        <span className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-muted">Piece</span>
          <span className="time text-3xl">{pieceTime}</span>
        </span>
      )}
    </button>
  );
}
