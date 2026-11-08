import { useState } from 'react';
import { BackLink } from '../components/BackLink';
import { BigButton } from '../components/BigButton';
import { ConfirmButton } from '../components/ConfirmButton';
import { downloadText } from '../components/download';
import { LinkButton } from '../components/LinkButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { Sheet } from '../components/Sheet';
import { TimeEditor } from '../components/TimeEditor';
import { resetProgram, resetRow, saveProgTime } from '../db/prognostics';
import { useProgTable } from '../hooks/useData';
import { formatProg, toPrognosticCsv, type PrognosticRow } from '../lib/prognostic';
import { activePrograms, GENDER_LABEL, GRADES, PROGRAM_LABEL, type Program } from '../lib/programme';
import { useSettings } from '../state/settings';

/** The prognostic table for each active programme (SPEC §7b). Tap a row to edit it. */
export function PrognosticTables() {
  const programs = activePrograms(useSettings((state) => state.program));
  const [program, setProgram] = useState<Program>(programs[0]!);
  const [editing, setEditing] = useState<PrognosticRow | null>(null);
  const table = useProgTable();
  const rows = table?.filter((row) => row.program === program) ?? [];
  const editedCount = rows.filter((row) => row.isOverride).length;

  return (
    <>
      <ScreenHeader title="Prognostics" action={<BackLink to="/crews/settings" />} />

      <div className="flex flex-col gap-4">
        {programs.length > 1 && (
          <Segmented
            label="Programme"
            hideLabel
            options={programs.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))}
            value={program}
            onChange={setProgram}
          />
        )}

        <div className="flex gap-2">
          <LinkButton to="/crews/settings/progs/import" variant="secondary" size="control" className="flex-1">
            Import CSV
          </LinkButton>
          <BigButton
            variant="secondary"
            className="flex-1"
            disabled={!table}
            onClick={() => table && downloadText('prognostics.csv', toPrognosticCsv(table), 'text/csv')}
          >
            Export CSV
          </BigButton>
        </div>

        <p className="text-base text-muted">
          2k times. Tap a row to change it. <span className="font-bold text-ink">●</span> = your edit.
        </p>

        {GRADES[program].map((grade) => {
          const gradeRows = rows.filter((row) => row.grade === grade);
          if (gradeRows.length === 0) return null;
          return (
            <section key={grade} aria-label={`${PROGRAM_LABEL[program]} ${grade}`}>
              <h2 className="mb-1 text-xl font-bold">{grade}</h2>
              <ul className="flex flex-col">
                {gradeRows.map((row) => (
                  <li key={row.key}>
                    <button
                      type="button"
                      onClick={() => setEditing(row)}
                      aria-label={`${grade} ${row.boatClass} ${GENDER_LABEL[row.gender]} ${formatProg(row.prog2kSec)}${row.isOverride ? ', edited' : ''}`}
                      className="flex min-h-control w-full items-center justify-between gap-3 border-b border-surface px-1 text-left text-lg active:bg-surface"
                    >
                      <span className="font-semibold">
                        {row.boatClass} <span className="text-muted">{row.gender}</span>
                      </span>
                      <span className="time">
                        {row.isOverride && <span aria-hidden="true">● </span>}
                        {formatProg(row.prog2kSec)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}

        {editedCount > 0 && (
          <div className="mt-4 border-t-2 border-surface pt-4">
            <ConfirmButton
              label={`Reset all ${editedCount} edits in ${PROGRAM_LABEL[program]}`}
              question={`Put every ${PROGRAM_LABEL[program]} row back to the built-in time? Rows you added are removed.`}
              confirmLabel="Reset table"
              onConfirm={() => void resetProgram(program)}
            />
          </div>
        )}
      </div>

      {editing && <RowSheet row={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function RowSheet({ row, onClose }: { row: PrognosticRow; onClose: () => void }) {
  const [value, setValue] = useState(row.prog2kSec);
  const builtIn = row.defaultProg2kSec;

  return (
    <Sheet title={`${row.grade} ${row.boatClass} ${GENDER_LABEL[row.gender]}`} onClose={onClose}>
      <TimeEditor value={value} onChange={setValue} base={builtIn !== undefined ? { sec: builtIn, label: 'Built-in' } : undefined} />
      <div className="mt-4 flex flex-col gap-2">
        <BigButton
          variant="go"
          onClick={() => {
            void saveProgTime({ ...row, prog2kSec: value });
            onClose();
          }}
        >
          Save {formatProg(value)}
        </BigButton>
        {row.isOverride && (
          <BigButton
            variant="secondary"
            onClick={() => {
              void resetRow(row.key);
              onClose();
            }}
          >
            {builtIn !== undefined ? `Reset to built-in ${formatProg(builtIn)}` : 'Remove this row'}
          </BigButton>
        )}
      </div>
    </Sheet>
  );
}
