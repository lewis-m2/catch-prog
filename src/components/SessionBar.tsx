import { useNavigate } from 'react-router-dom';
import { useHaptics } from '../hooks/useHaptics';

/** Placeholder: the live session and piece clocks arrive in Phase 2. */
export function SessionBar() {
  const navigate = useNavigate();
  const haptics = useHaptics();
  return (
    <button
      type="button"
      aria-label="Session clock: no session running. Open Timers."
      className="flex w-full shrink-0 items-center justify-between border-b-2 border-surface bg-bg px-4 pt-[env(safe-area-inset-top)] text-left active:opacity-70"
      onClick={() => {
        haptics.tap();
        navigate('/timers');
      }}
    >
      <span className="flex h-14 items-center text-base font-semibold text-muted">No session</span>
      <span className="time text-3xl">0:00.0</span>
    </button>
  );
}
