import { Link } from 'react-router-dom';
import { BigButton } from '../components/BigButton';
import { LinkButton } from '../components/LinkButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { useCrews, useProgTable } from '../hooks/useData';
import { useHaptics } from '../hooks/useHaptics';
import { describeEvent } from '../lib/crews';
import { baseProg, formatProg, PROG_SOURCE_LABEL } from '../lib/prognostic';
import { PROGRAM_LABEL, type ProgramSetting } from '../lib/programme';
import { useSettings } from '../state/settings';

export function Crews() {
  const program = useSettings((state) => state.program);
  const crews = useCrews();
  const table = useProgTable();

  return (
    <>
      <ScreenHeader title="Crews" action={<SettingsLink />} />

      {program === null ? (
        <ProgrammeChoice />
      ) : (
        <>
          <div className="mb-4 flex gap-2">
            <LinkButton to="/crews/new" className="flex-1">
              + Add crew
            </LinkButton>
            <LinkButton to="/crews/quick-add" variant="secondary" className="flex-1">
              Quick add
            </LinkButton>
          </div>

          {crews?.length === 0 && (
            <p className="text-lg text-muted">
              No crews yet. Add one, or use Quick add to paste a list (one crew per line).
            </p>
          )}

          <ul className="flex flex-col gap-2">
            {crews?.map((crew) => {
              const prog = table ? baseProg(crew, table) : null;
              return (
                <li key={crew.id}>
                  <Link
                    to={`/crews/${crew.id}`}
                    className="flex min-h-primary items-center justify-between gap-3 rounded-xl bg-surface px-4 py-2 active:opacity-70"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-xl font-bold">{crew.name}</span>
                      <span className="block text-base text-muted">
                        {describeEvent(crew)}
                        {program === 'both' && ` · ${PROGRAM_LABEL[crew.program]}`}
                      </span>
                    </span>
                    {prog && (
                      <span className="shrink-0 text-right">
                        <span className="time block text-xl">{prog.sec !== null ? formatProg(prog.sec) : '—'}</span>
                        <span className={`block text-sm ${prog.source === 'none' ? 'font-bold text-stop' : 'text-muted'}`}>
                          {PROG_SOURCE_LABEL[prog.source]}
                        </span>
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}

const PROGRAMME_OPTIONS: { value: ProgramSetting; label: string; detail: string }[] = [
  { value: 'school', label: 'School', detail: 'Maadi grades: U15, U16, U17, U18, Novice' },
  { value: 'club', label: 'Club', detail: 'NZ Championships grades: Novice to Premier' },
  { value: 'both', label: 'Both', detail: 'All grades, grouped by programme' },
];

/** First run (SPEC §7a): which programme's grades and prognostic tables to use. Changeable in Settings. */
function ProgrammeChoice() {
  const update = useSettings((state) => state.update);
  return (
    <section aria-labelledby="programme-heading" className="flex flex-col gap-3">
      <h2 id="programme-heading" className="text-2xl font-bold">
        Which programme do you coach?
      </h2>
      <p className="text-lg text-muted">This sets the grades and prognostic tables. You can change it in Settings.</p>
      {PROGRAMME_OPTIONS.map((option) => (
        <BigButton
          key={option.value}
          variant="secondary"
          size="primary"
          className="flex flex-col items-start py-2 text-left"
          onClick={() => update({ program: option.value })}
        >
          <span className="text-xl">{option.label}</span>
          <span className="text-base font-normal text-muted">{option.detail}</span>
        </BigButton>
      ))}
    </section>
  );
}

function SettingsLink() {
  const haptics = useHaptics();
  return (
    <Link
      to="/crews/settings"
      aria-label="Settings"
      onClick={() => haptics.tap()}
      className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface active:opacity-70"
    >
      <GearIcon />
    </Link>
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
