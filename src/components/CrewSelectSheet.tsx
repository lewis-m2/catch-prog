import type { Crew } from '../db/types';
import { describeEvent } from '../lib/crews';
import { useStagger } from '../state/stagger';
import { BigButton } from './BigButton';
import { LinkButton } from './LinkButton';
import { Sheet } from './Sheet';

/** Pick the crews for a staggered piece: tap to add or remove. */
export function CrewSelectSheet({ crews, onClose }: { crews: Crew[]; onClose: () => void }) {
  const crewIds = useStagger((state) => state.crewIds);
  const { toggleCrew, setDraft } = useStagger.getState();
  const count = crews.filter((crew) => crewIds.includes(crew.id)).length;

  return (
    <Sheet title="Crews in the piece" onClose={onClose}>
      <div className="flex flex-col gap-2">
        {crews.length === 0 && (
          <>
            <p className="text-lg text-muted">No crews yet.</p>
            <LinkButton to="/crews/new">+ Add a crew</LinkButton>
          </>
        )}
        {crews.map((crew) => {
          const selected = crewIds.includes(crew.id);
          return (
            <BigButton
              key={crew.id}
              variant={selected ? 'primary' : 'secondary'}
              size="primary"
              aria-pressed={selected}
              className="flex items-center gap-3 text-left"
              onClick={() => toggleCrew(crew.id)}
            >
              <span aria-hidden="true" className="w-6 shrink-0 text-2xl">
                {selected ? '✓' : '+'}
              </span>
              <span className="min-w-0">
                <span className="block truncate">{crew.name}</span>
                <span className="block text-base font-semibold opacity-80">{describeEvent(crew)}</span>
              </span>
            </BigButton>
          );
        })}
        {crews.length > 0 && (
          <div className="mt-2 flex gap-2">
            {count > 0 && (
              <BigButton variant="secondary" className="flex-1" onClick={() => setDraft({ crewIds: [], nudges: {} })}>
                Clear all
              </BigButton>
            )}
            <BigButton variant="go" className="flex-[2]" onClick={onClose}>
              Done · {count} crew{count === 1 ? '' : 's'}
            </BigButton>
          </div>
        )}
      </div>
    </Sheet>
  );
}
