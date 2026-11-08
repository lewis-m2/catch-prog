import { Link } from 'react-router-dom';
import { BigButton } from '../components/BigButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useHaptics } from '../hooks/useHaptics';
import type { ThemeSetting } from '../lib/theme';
import { useSettings } from '../state/settings';

const THEMES: { value: ThemeSetting; label: string }[] = [
  { value: 'sun', label: 'Sun' },
  { value: 'dawn', label: 'Dawn' },
  { value: 'auto', label: 'Auto' },
];

export function Settings() {
  const haptics = useHaptics();
  const theme = useSettings((state) => state.theme);
  const setTheme = useSettings((state) => state.setTheme);

  return (
    <>
      <ScreenHeader
        title="Settings"
        action={
          <Link
            to="/crews"
            onClick={() => haptics.tap()}
            className="flex min-h-control items-center rounded-xl bg-surface px-4 text-lg font-bold active:opacity-70"
          >
            Back
          </Link>
        }
      />

      <section aria-labelledby="theme-heading" className="mb-8">
        <h2 id="theme-heading" className="mb-2 text-xl font-bold">
          Theme
        </h2>
        <div className="flex gap-2">
          {THEMES.map(({ value, label }) => {
            const selected = theme === value;
            return (
              <BigButton
                key={value}
                variant={selected ? 'primary' : 'secondary'}
                aria-pressed={selected}
                className="min-h-primary flex-1"
                onClick={() => setTheme(value)}
              >
                {selected ? `✓ ${label}` : label}
              </BigButton>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="checks-heading" className="flex flex-col gap-3">
        <h2 id="checks-heading" className="text-xl font-bold">
          Device checks
        </h2>
        <BigButton variant="secondary" onClick={() => haptics.go()}>
          Test vibration
        </BigButton>
        <p className="text-base">
          <span className="text-muted">Build: </span>
          <span className="font-semibold">{__BUILD_ID__}</span>
        </p>
      </section>
    </>
  );
}
