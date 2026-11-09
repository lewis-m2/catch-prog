import { useState } from 'react';
import { BigButton } from '../../components/BigButton';
import { CrewSelectSheet } from '../../components/CrewSelectSheet';
import { CrewTimeSheet } from '../../components/CrewTimeSheet';
import { LinkButton } from '../../components/LinkButton';
import { ScreenHeader } from '../../components/ScreenHeader';
import { Segmented } from '../../components/Segmented';
import { StartList } from '../../components/StartList';
import { StartSheet } from '../../components/StartSheet';
import { useStaggerPlan } from '../../hooks/useStaggerPlan';
import {
  MAX_DISTANCE_M,
  MAX_DURATION_SEC,
  MIN_DISTANCE_M,
  MIN_DURATION_SEC,
  MODEL_LABEL,
  type PieceType,
  type PlanEntry,
  type PredictionModel,
  type StaggerMode,
} from '../../lib/stagger';
import { formatDuration } from '../../lib/stagger-piece';
import { formatClock, parseDuration } from '../../lib/time';
import { useStagger } from '../../state/stagger';

const DISTANCES = [250, 500, 750, 1000, 1500, 2000];
const DURATIONS = [60, 120, 180, 240, 300, 600];

/** Staggered piece setup (SPEC §5a): crews, piece, model, then the start order. */
export function PieceSetup() {
  const draft = useStagger();
  const { setDraft } = useStagger.getState();
  const { loading, allCrews, chosen, times, missing, plan, pieceValid } = useStaggerPlan();
  const [picking, setPicking] = useState(false);
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [nudging, setNudging] = useState<PlanEntry | null>(null);

  const adjustCrew = adjusting ? chosen.find((crew) => crew.id === adjusting) : undefined;
  const adjustTime = adjusting ? times.find((time) => time.crewId === adjusting) : undefined;
  const canStart = plan !== null && missing.length === 0;
  const nudged = plan?.entries.some((entry) => entry.nudged) ?? false;

  if (loading) return null;

  return (
    <>
      <ScreenHeader title="Staggered piece" />

      <div className="flex flex-col gap-5">
        <Segmented
          label="Times from"
          options={[
            { value: 'prog' as StaggerMode, label: 'Prog' },
            { value: 'custom' as StaggerMode, label: 'Custom' },
          ]}
          value={draft.mode}
          onChange={(mode) => setDraft({ mode })}
        />
        <p className="-mt-3 text-base text-muted">
          {draft.mode === 'prog'
            ? 'Prognostic times: table, crew override, or this session’s adjustment.'
            : 'Your own times for this piece. Each crew starts from its time in the last piece.'}
        </p>

        <section aria-labelledby="crews-heading" className="flex flex-col gap-2">
          <h2 id="crews-heading" className="text-xl font-bold">
            Crews
          </h2>
          {allCrews.length === 0 ? (
            <>
              <p className="text-lg text-muted">Add crews on the Crews tab first.</p>
              <LinkButton to="/crews/new">+ Add a crew</LinkButton>
            </>
          ) : (
            <BigButton variant={chosen.length === 0 ? 'primary' : 'secondary'} size="primary" onClick={() => setPicking(true)}>
              {chosen.length === 0 ? 'Choose crews' : `${chosen.length} crew${chosen.length === 1 ? '' : 's'} · change`}
            </BigButton>
          )}
        </section>

        <section aria-labelledby="piece-heading" className="flex flex-col gap-3">
          <h2 id="piece-heading" className="text-xl font-bold">
            Piece
          </h2>
          <Segmented
            label="Piece type"
            hideLabel
            options={[
              { value: 'distance' as PieceType, label: 'Distance' },
              { value: 'time' as PieceType, label: 'Time' },
            ]}
            value={draft.type}
            onChange={(type) => setDraft({ type })}
          />
          {draft.type === 'distance' ? (
            <>
              <Segmented
                label="Distance"
                hideLabel
                options={DISTANCES.map((m) => ({ value: m, label: `${m}` }))}
                value={DISTANCES.includes(draft.distanceM) ? draft.distanceM : null}
                onChange={(distanceM) => setDraft({ distanceM })}
              />
              <NumberField
                key={`d-${draft.distanceM}`}
                label="Metres"
                value={String(draft.distanceM)}
                inputMode="numeric"
                parse={(text) => {
                  const m = Number(text);
                  return Number.isInteger(m) && m >= MIN_DISTANCE_M && m <= MAX_DISTANCE_M ? m : null;
                }}
                error={`Between ${MIN_DISTANCE_M} and ${MAX_DISTANCE_M} m`}
                onCommit={(distanceM) => setDraft({ distanceM })}
              />
            </>
          ) : (
            <>
              <Segmented
                label="Duration"
                hideLabel
                options={DURATIONS.map((sec) => ({ value: sec, label: formatDuration(sec) }))}
                value={DURATIONS.includes(draft.durationSec) ? draft.durationSec : null}
                onChange={(durationSec) => setDraft({ durationSec })}
              />
              <NumberField
                key={`t-${draft.durationSec}`}
                label="Time (m:ss)"
                value={formatDuration(draft.durationSec)}
                inputMode="decimal"
                parse={(text) => {
                  const ms = parseDuration(text);
                  const sec = ms === null ? null : Math.round(ms / 1000);
                  return sec !== null && sec >= MIN_DURATION_SEC && sec <= MAX_DURATION_SEC ? sec : null;
                }}
                error="Between 0:30 and 60:00"
                onCommit={(durationSec) => setDraft({ durationSec })}
              />
            </>
          )}

          <Segmented
            label="Prediction"
            options={(['linear', 'paul'] as PredictionModel[]).map((m) => ({ value: m, label: MODEL_LABEL[m] }))}
            value={draft.model}
            onChange={(model) => setDraft({ model })}
          />
          <p className="-mt-1 text-base text-muted">
            {draft.model === 'linear'
              ? 'Linear: the same speed as the 2k.'
              : "Paul's law: 5 s per 500 m quicker for each halving of the distance (slower when longer)."}
          </p>

          <label className="flex flex-col gap-1">
            <span className="text-base font-semibold text-muted">Label (optional)</span>
            <input
              value={draft.label}
              onChange={(event) => setDraft({ label: event.target.value })}
              placeholder="e.g. Race pace #2"
              className="min-h-control w-full rounded-xl border-2 border-surface bg-bg px-3 text-lg"
            />
          </label>
        </section>

        {chosen.length > 0 && (
          <section aria-labelledby="order-heading" className="flex flex-col gap-2">
            <h2 id="order-heading" className="text-xl font-bold">
              Start order
            </h2>
            {plan && (
              <>
                <p className="text-base text-muted">Tap a start to move it. Tap a crew to adjust its time.</p>
                <StartList plan={plan} times={times} onNudge={setNudging} onAdjust={setAdjusting} />
                <p className="text-lg">
                  All finish at about{' '}
                  <span className="time">{formatClock(Math.round(plan.finishSec * 1000))}</span> on the master clock.
                </p>
                {draft.type === 'time' && <TimePieceNote fastest={plan.entries.at(-1)?.name} durationSec={draft.durationSec} />}
                {nudged && (
                  <BigButton variant="secondary" onClick={() => setDraft({ nudges: {} })}>
                    Work out all starts again
                  </BigButton>
                )}
              </>
            )}
            {!pieceValid && <p className="text-lg font-bold text-stop">Set a valid {draft.type === 'distance' ? 'distance' : 'time'}.</p>}
            {missing.length > 0 && (
              <div role="alert" className="flex flex-col gap-2 rounded-xl border-2 border-stop p-3">
                <p className="text-lg font-bold">No time for:</p>
                {missing.map((time) => (
                  <BigButton key={time.crewId} variant="secondary" onClick={() => setAdjusting(time.crewId)}>
                    {time.name} · set a time
                  </BigButton>
                ))}
              </div>
            )}
          </section>
        )}

        <BigButton
          variant="go"
          disabled={!canStart}
          className="disabled:opacity-40"
          onClick={() => setDraft({ stage: 'ready' })}
        >
          {canStart ? 'Go to start' : chosen.length === 0 ? 'Choose crews to start' : 'Fix the setup to start'}
        </BigButton>
      </div>

      {picking && <CrewSelectSheet crews={allCrews} onClose={() => setPicking(false)} />}
      {adjustCrew && adjustTime && (
        <CrewTimeSheet crew={adjustCrew} time={adjustTime} mode={draft.mode} onClose={() => setAdjusting(null)} />
      )}
      {nudging && plan && <StartSheet entry={nudging} shiftSec={plan.shiftSec} onClose={() => setNudging(null)} />}
    </>
  );
}

function TimePieceNote({ fastest, durationSec }: { fastest?: string; durationSec: number }) {
  return (
    <p className="rounded-xl bg-surface p-3 text-base">
      Time piece: the fastest crew{fastest ? ` (${fastest})` : ''} rows {formatDuration(durationSec)}. Slower crews start
      earlier and row a little longer, so everyone should finish together.
    </p>
  );
}

/** A text box that only changes the setup when what's typed is valid. */
function NumberField({
  label,
  value,
  inputMode,
  parse,
  error,
  onCommit,
}: {
  label: string;
  value: string;
  inputMode: 'numeric' | 'decimal';
  parse: (text: string) => number | null;
  error: string;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(value);
  const parsed = parse(text);
  return (
    <label className="flex flex-col gap-1">
      <span className="text-base font-semibold text-muted">{label}</span>
      <input
        value={text}
        inputMode={inputMode}
        aria-invalid={parsed === null}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => (parsed !== null ? onCommit(parsed) : setText(value))}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        className={`time min-h-control w-full rounded-xl border-2 bg-bg px-3 text-lg ${parsed === null ? 'border-stop' : 'border-surface'}`}
      />
      {parsed === null && <span className="text-base font-bold text-stop">{error}</span>}
    </label>
  );
}
