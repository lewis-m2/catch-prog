import { Link } from 'react-router-dom';
import { useHaptics } from '../hooks/useHaptics';

export function BackLink({ to, label = 'Back' }: { to: string; label?: string }) {
  const haptics = useHaptics();
  return (
    <Link
      to={to}
      onClick={() => haptics.tap()}
      className="flex min-h-control shrink-0 items-center rounded-xl bg-surface px-4 text-lg font-bold active:opacity-70"
    >
      {label}
    </Link>
  );
}
