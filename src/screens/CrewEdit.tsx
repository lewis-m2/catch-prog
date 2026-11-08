import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { BigButton } from '../components/BigButton';
import { ConfirmButton } from '../components/ConfirmButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { Sheet } from '../components/Sheet';
import { TimeEditor } from '../components/TimeEditor';
import { deleteCrew, newCrew, saveCrew } from '../db/crews';
import type { Athlete, Crew } from '../db/types';
import { useCrew, useCrews, useProgTable } from '../hooks/useData';
import { findRow, formatProg } from '../lib/prognostic';
import {
  activePrograms,
  BOAT_CLASSES,
  GENDER_LABEL,
  GRADES,
  PROGRAM_LABEL,
  seatsFor,
  type Gender,
  type Program,
} from '../lib/programme';
import { useSettings } from '../state/settings';

/** Add (`/crews/new`) or edit (`/crews/:id`) a crew. */
export function CrewEdit() {
  const { id } = useParams();
  const isNew = id === undefined;
  const crew = useCrew(id);

  if (!isNew && crew === undefined) return null; // loading
  if (!isNew && crew === null) {
    return (
      <>
        <ScreenHeader title="Crew" action={<BackLink to="/crews" />} />
        <p className="text-lg">This crew has been deleted.</p>
      </>
    );
  }
  // Keyed so the form starts fresh for each crew.
  return <CrewForm key={id ?? 'new'} crew={crew ?? null} />;
}

type Draft = Omit<Crew, 'id' | 'createdAt' | 'updatedAt'>;

function CrewForm({ crew }: { crew: Crew | null }) {
  const navigate = useNavigate();
  const setting = useSettings((state) => state.program);
  const table = useProgTable();
  const crews = useCrews();

  const programs = activePrograms(setting);
  const [draft, setDraft] = useState<Draft>(() =>
    crew
      ? { ...crew }
      : { name: '', program: programs[0]!, boatClass: '8+', gender: 'W', grade: GRADES[programs[0]!][0]! },
  );
  const [nameError, setNameError] = useState<string | null>(null);
  const [editingProg, setEditingProg] = useState(false);
  const [showAthletes, setShowAthletes] = useState((crew?.athletes?.length ?? 0) > 0);

  const programOptions = programs.includes(draft.program) ? programs : [...programs, draft.program];
  const change = (patch: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...patch }));
  const tableRow = table ? findRow(table, draft) : undefined;

  const setProgram = (program: Program) => {
    // Keep the grade if the other programme has it too (Novice); otherwise pick its first.
    const grade = GRADES[program].includes(draft.grade) ? draft.grade : GRADES[program][0]!;
    change({ program, grade });
  };

  const save = async () => {
    const name = draft.name.trim();
    if (name === '') return setNameError('Give the crew a name');
    const clash = crews?.some((c) => c.id !== crew?.id && c.name.trim().toLowerCase() === name.toLowerCase());
    if (clash) return setNameError(`There's already a crew called "${name}"`);

    const athletes = cleanAthletes(draft.athletes, draft.boatClass);
    const record: Crew = { ...(crew ?? newCrew(draft)), ...draft, name, athletes };
    await saveCrew(record);
    navigate('/crews');
  };

  return (
    <>
      <ScreenHeader title={crew ? 'Edit crew' : 'New crew'} action={<BackLink to="/crews" label="Cancel" />} />

      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="text-base font-semibold text-muted">Name</span>
          <input
            value={draft.name}
            onChange={(event) => {
              change({ name: event.target.value });
              setNameError(null);
            }}
            placeholder="e.g. Girls U17 8+ A"
            aria-invalid={nameError !== null}
            className={`min-h-control w-full rounded-xl border-2 bg-bg px-3 text-xl ${nameError ? 'border-stop' : 'border-surface'}`}
          />
          {nameError && <span className="text-base font-bold text-stop">{nameError}</span>}
        </label>

        {programOptions.length > 1 && (
          <Segmented
            label="Programme"
            options={programOptions.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))}
            value={draft.program}
            onChange={setProgram}
          />
        )}

        <Segmented
          label="Gender"
          options={(['W', 'M'] as Gender[]).map((g) => ({ value: g, label: GENDER_LABEL[g] }))}
          value={draft.gender}
          onChange={(gender) => change({ gender })}
        />

        <Segmented
          label="Boat"
          options={BOAT_CLASSES.map((b) => ({ value: b as string, label: b }))}
          value={draft.boatClass}
          onChange={(boatClass) => change({ boatClass })}
        />

        <Segmented
          label="Grade"
          options={GRADES[draft.program].map((g) => ({ value: g, label: g }))}
          value={draft.grade}
          onChange={(grade) => change({ grade })}
        />

        <section aria-labelledby="prog-heading" className="flex flex-col gap-2 rounded-xl border-2 border-surface p-3">
          <h2 id="prog-heading" className="text-xl font-bold">
            Prognostic 2k
          </h2>
          <p className="text-lg">
            <span className="text-muted">Table: </span>
            {tableRow ? (
              <span className="time">{formatProg(tableRow.prog2kSec)}</span>
            ) : (
              <span className="font-bold">no row for {draft.boatClass} {draft.gender} {draft.grade}</span>
            )}
          </p>
          {draft.overrideProg2kSec !== undefined && (
            <p className="text-lg">
              <span className="text-muted">Crew override: </span>
              <span className="time">{formatProg(draft.overrideProg2kSec)}</span>
              <span className="text-muted"> (used instead of the table)</span>
            </p>
          )}
          <div className="flex gap-2">
            <BigButton variant="primary" size="control" className="flex-1" onClick={() => setEditingProg(true)}>
              {draft.overrideProg2kSec !== undefined ? 'Change override' : 'Set crew override'}
            </BigButton>
            {draft.overrideProg2kSec !== undefined && (
              <BigButton variant="secondary" className="flex-1" onClick={() => change({ overrideProg2kSec: undefined })}>
                Use table
              </BigButton>
            )}
          </div>
        </section>

        <section aria-labelledby="athletes-heading" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h2 id="athletes-heading" className="text-xl font-bold">
              Athletes <span className="font-normal text-muted">(optional)</span>
            </h2>
            <BigButton variant="secondary" aria-expanded={showAthletes} onClick={() => setShowAthletes((open) => !open)}>
              {showAthletes ? 'Hide' : 'Show'}
            </BigButton>
          </div>
          {showAthletes &&
            seatsFor(draft.boatClass).map((seat) => (
              <label key={seat} className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-lg font-semibold text-muted">{seat}</span>
                <input
                  value={draft.athletes?.find((a) => a.seat === seat)?.name ?? ''}
                  onChange={(event) => change({ athletes: setAthlete(draft.athletes, seat, event.target.value) })}
                  className="min-h-control w-full rounded-xl border-2 border-surface bg-bg px-3 text-lg"
                />
              </label>
            ))}
        </section>

        <BigButton type="submit" variant="go">
          {crew ? 'Save crew' : 'Add crew'}
        </BigButton>
      </form>

      {crew && (
        <div className="mt-8 border-t-2 border-surface pt-4">
          <ConfirmButton
            label="Delete crew"
            question={`Delete ${crew.name}? This can't be undone.`}
            confirmLabel="Delete"
            onConfirm={() => {
              void deleteCrew(crew.id).then(() => navigate('/crews'));
            }}
          />
        </div>
      )}

      {editingProg && (
        <OverrideSheet
          initial={draft.overrideProg2kSec ?? tableRow?.prog2kSec ?? 420}
          tableSec={tableRow?.prog2kSec}
          onClose={() => setEditingProg(false)}
          onSave={(sec) => {
            change({ overrideProg2kSec: sec });
            setEditingProg(false);
          }}
        />
      )}
    </>
  );
}

function OverrideSheet({
  initial,
  tableSec,
  onClose,
  onSave,
}: {
  initial: number;
  tableSec?: number;
  onClose: () => void;
  onSave: (sec: number) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Sheet title="Crew override" onClose={onClose}>
      <TimeEditor value={value} onChange={setValue} base={tableSec !== undefined ? { sec: tableSec, label: 'Table' } : undefined} />
      <BigButton variant="go" className="mt-4 w-full" onClick={() => onSave(value)}>
        Use {formatProg(value)}
      </BigButton>
    </Sheet>
  );
}

function setAthlete(athletes: Athlete[] | undefined, seat: string, name: string): Athlete[] {
  return [...(athletes ?? []).filter((a) => a.seat !== seat), { seat, name }];
}

/** Only named seats that exist in this boat, in seat order. Undefined when there are none. */
function cleanAthletes(athletes: Athlete[] | undefined, boatClass: string): Athlete[] | undefined {
  const seats = seatsFor(boatClass);
  const named = seats
    .map((seat) => ({ seat, name: athletes?.find((a) => a.seat === seat)?.name.trim() ?? '' }))
    .filter((a) => a.name !== '');
  return named.length > 0 ? named : undefined;
}
