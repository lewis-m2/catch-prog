import { BigButton } from '../../components/BigButton';
import { StartList } from '../../components/StartList';
import { TimingButton } from '../../components/TimingButton';
import { useStaggerPlan } from '../../hooks/useStaggerPlan';
import { MODEL_LABEL } from '../../lib/stagger';
import { describePiece } from '../../lib/stagger-piece';
import { formatClock } from '../../lib/time';
import { useStagger } from '../../state/stagger';

/** The start list with the big START (SPEC §5c). START starts the master clock with the first crew. */
export function PieceReady() {
  const draft = useStagger();
  const { setDraft, start } = useStagger.getState();
  const { loading, plan, times, missing } = useStaggerPlan();

  if (loading) return null;
  // Crews were removed or lost their times since setup: back to the setup to fix it.
  if (!plan || missing.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-lg">This piece needs changes before it can start.</p>
        <BigButton variant="primary" onClick={() => setDraft({ stage: 'setup' })}>
          Back to setup
        </BigButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-lg font-bold text-muted">
          {describePiece(draft)} · {MODEL_LABEL[draft.model]}
        </p>
        <p className="time text-[min(4.5rem,24vw)] leading-none" aria-label="Master clock 0:00.0">
          0:00.0
        </p>
      </div>

      <TimingButton variant="go" height="hero" onPress={(at) => start(at, plan, times)}>
        START · {plan.entries[0]!.name}
      </TimingButton>
      <p className="-mt-2 text-base text-muted">Press as the first crew goes. The others get a countdown and GO!</p>

      <StartList plan={plan} times={times} />
      <p className="text-lg">
        All finish at about <span className="time">{formatClock(Math.round(plan.finishSec * 1000))}</span> on the master clock.
      </p>

      <BigButton variant="secondary" onClick={() => setDraft({ stage: 'setup' })}>
        Back to setup
      </BigButton>
    </div>
  );
}
