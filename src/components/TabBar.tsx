import { NavLink } from 'react-router-dom';
import { useHaptics } from '../hooks/useHaptics';

const TABS = [
  { to: '/rate', label: 'Rate' },
  { to: '/timers', label: 'Timers' },
  { to: '/pieces', label: 'Pieces' },
  { to: '/crews', label: 'Crews' },
];

export function TabBar() {
  const haptics = useHaptics();
  return (
    <nav aria-label="Main" className="flex shrink-0 border-t-2 border-surface bg-bg pb-[env(safe-area-inset-bottom)]">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          onClick={() => haptics.tap()}
          // The active tab is marked by a bar and heavier text as well as colour.
          className={({ isActive }) =>
            `flex h-16 flex-1 items-center justify-center border-t-4 text-lg active:opacity-70 ${
              isActive ? 'border-accent font-extrabold text-accent' : 'border-transparent font-semibold text-muted'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
