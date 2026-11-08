import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { BigButton } from '../components/BigButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { Segmented } from '../components/Segmented';
import { addCrews } from '../db/crews';
import { useCrews } from '../hooks/useData';
import { describeEvent, parseQuickAdd } from '../lib/crews';
import { PROGRAM_LABEL, PROGRAMS, type Program } from '../lib/programme';
import { useSettings } from '../state/settings';

const EXAMPLE = 'Girls U17 8+ A, 8+, W, U17\nBoys U16 4x+, 4x+, M, U16';

/** Paste a list of crews, one per line (SPEC §4b). */
export function QuickAdd() {
  const navigate = useNavigate();
  const setting = useSettings((state) => state.program) ?? 'school';
  const crews = useCrews();
  const [text, setText] = useState('');
  const [noviceProgram, setNoviceProgram] = useState<Program>('school');

  const result = parseQuickAdd(text, setting, noviceProgram, crews?.map((crew) => crew.name));
  const count = result.crews.length;

  return (
    <>
      <ScreenHeader title="Quick add" action={<BackLink to="/crews" label="Cancel" />} />

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-lg">
            One crew per line: <span className="font-bold">name, boat, gender, grade</span>
          </span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={6}
            placeholder={EXAMPLE}
            autoCapitalize="words"
            className="w-full rounded-xl border-2 border-surface bg-bg p-3 text-lg"
          />
        </label>

        {setting === 'both' && (
          <Segmented
            label="Novice crews are"
            options={PROGRAMS.map((p) => ({ value: p, label: PROGRAM_LABEL[p] }))}
            value={noviceProgram}
            onChange={setNoviceProgram}
          />
        )}

        {result.errors.length > 0 && (
          <div role="alert" className="flex flex-col gap-1 rounded-xl border-2 border-stop p-3">
            <p className="text-lg font-bold">
              {result.errors.length} line{result.errors.length === 1 ? '' : 's'} can't be added:
            </p>
            {result.errors.map((error) => (
              <p key={error.line} className="text-base">
                <span className="font-bold">Line {error.line}:</span> {error.message}
              </p>
            ))}
          </div>
        )}

        {count > 0 && (
          <ul aria-label="Crews to add" className="flex flex-col gap-1">
            {result.crews.map((crew) => (
              <li key={crew.name} className="rounded-lg bg-surface px-3 py-2 text-lg">
                <span className="font-bold">✓ {crew.name}</span>
                <span className="text-muted">
                  {' '}
                  · {describeEvent(crew)}
                  {setting === 'both' && ` · ${PROGRAM_LABEL[crew.program]}`}
                </span>
              </li>
            ))}
          </ul>
        )}

        <BigButton
          variant="go"
          disabled={count === 0}
          className="disabled:opacity-40"
          onClick={() => {
            void addCrews(result.crews).then(() => navigate('/crews'));
          }}
        >
          {count === 0 ? 'Add crews' : `Add ${count} crew${count === 1 ? '' : 's'}`}
        </BigButton>
      </div>
    </>
  );
}
