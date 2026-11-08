import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { BigButton } from '../components/BigButton';
import { ConfirmButton } from '../components/ConfirmButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { readFileText } from '../components/download';
import { DEFAULT_PROGNOSTICS } from '../data/prognostics';
import { db } from '../db/db';
import { applyImport, toEntry } from '../db/prognostics';
import { useLiveQuery } from '../hooks/useLiveQuery';
import { CSV_HEADER, parsePrognosticCsv, planImport, type ImportMode } from '../lib/prognostic';

const MODES: { value: ImportMode; label: string }[] = [
  { value: 'merge', label: 'Merge' },
  { value: 'replace', label: 'Replace' },
];

/** Paste or pick a CSV of prognostic times (SPEC §4a). Shows what will change before importing. */
export function PrognosticImport() {
  const navigate = useNavigate();
  const overrides = useLiveQuery(() => db.prognosticOverrides.toArray(), []);
  const [text, setText] = useState('');
  const [mode, setMode] = useState<ImportMode>('merge');
  const [fileError, setFileError] = useState<string | null>(null);

  const { rows, errors } = parsePrognosticCsv(text);
  const plan = overrides ? planImport(DEFAULT_PROGNOSTICS, overrides.map(toEntry), rows, mode) : null;
  const done = () => navigate('/crews/settings/progs');
  const hasEffect = plan !== null && (plan.put.length > 0 || plan.removeKeys.length > 0 || plan.reverted > 0);

  return (
    <>
      <ScreenHeader title="Import CSV" action={<BackLink to="/crews/settings/progs" label="Cancel" />} />

      <div className="flex flex-col gap-4">
        <p className="text-lg">
          Columns: <span className="time break-all text-base">{CSV_HEADER}</span>
          <br />
          <span className="text-muted">e.g. </span>
          <span className="time text-base">school,8+,W,U17,6:45.0</span>
        </p>

        <label className="flex min-h-control cursor-pointer items-center justify-center rounded-xl bg-surface px-4 text-lg font-bold active:opacity-70">
          Choose a file…
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setFileError(null);
              readFileText(file)
                .then(setText)
                .catch(() => setFileError("Couldn't read that file."));
            }}
          />
        </label>
        {fileError && <p className="font-bold text-stop">{fileError}</p>}

        <label className="flex flex-col gap-1">
          <span className="text-base font-semibold text-muted">Or paste here (spreadsheet columns are fine)</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            spellCheck={false}
            className="time w-full rounded-xl border-2 border-surface bg-bg p-3 text-base font-normal"
          />
        </label>

        <Segmented label="How to import" options={MODES} value={mode} onChange={setMode} />
        <p className="text-base text-muted">
          {mode === 'merge'
            ? 'Merge: updates the rows in the file and keeps your other edits.'
            : 'Replace: removes all your edits first, then applies the file. Rows not in the file go back to the built-in time.'}
        </p>

        {errors.length > 0 && (
          <div role="alert" className="flex flex-col gap-1 rounded-xl border-2 border-stop p-3">
            <p className="text-lg font-bold">
              {errors.length} line{errors.length === 1 ? '' : 's'} skipped:
            </p>
            {errors.slice(0, 10).map((error) => (
              <p key={error.line} className="text-base">
                <span className="font-bold">Line {error.line}:</span> {error.message}
              </p>
            ))}
            {errors.length > 10 && <p className="text-base">…and {errors.length - 10} more.</p>}
          </div>
        )}

        {plan && rows.length > 0 && (
          <p className="text-lg" aria-live="polite">
            {rows.length} row{rows.length === 1 ? '' : 's'}: <span className="font-bold">{plan.changed} changed</span>,{' '}
            {plan.added} new, {plan.unchanged} the same
            {plan.reverted > 0 && `, and ${plan.reverted} of your edits removed`}.
          </p>
        )}

        {plan && plan.reverted > 0 ? (
          // Replacing removes edits the coach made, so it asks first.
          <ConfirmButton
            label="Import"
            question={`Remove ${plan.reverted} of your edits and import this file?`}
            confirmLabel="Replace"
            onConfirm={() => void applyImport(plan).then(done)}
          />
        ) : (
          <BigButton
            variant="go"
            disabled={!hasEffect}
            className="disabled:opacity-40"
            onClick={() => {
              if (plan) void applyImport(plan).then(done);
            }}
          >
            {hasEffect ? 'Import' : 'Nothing to import yet'}
          </BigButton>
        )}
      </div>
    </>
  );
}
