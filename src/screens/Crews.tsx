import { Link } from 'react-router-dom';
import { PlaceholderScreen } from '../components/PlaceholderScreen';
import { useHaptics } from '../hooks/useHaptics';

export function Crews() {
  const haptics = useHaptics();
  return (
    <PlaceholderScreen
      title="Crews"
      phase={3}
      action={
        <Link
          to="/crews/settings"
          aria-label="Settings"
          onClick={() => haptics.tap()}
          className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface active:opacity-70"
        >
          <GearIcon />
        </Link>
      }
    />
  );
}

function GearIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden="true">
      <circle cx="12" cy="12" r="3.25" />
      <path
        strokeLinecap="round"
        d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
      />
    </svg>
  );
}
