import { useEffect } from 'react';
import { useStagger } from '../state/stagger';
import { PieceLive } from './pieces/PieceLive';
import { PieceReady } from './pieces/PieceReady';
import { PieceResults } from './pieces/PieceResults';
import { PieceSetup } from './pieces/PieceSetup';

/** Staggered pieces (SPEC §5): Setup → Ready (START) → Live → Results, all on the Pieces tab. */
export function Pieces() {
  const piece = useStagger((state) => state.piece);
  const stage = useStagger((state) => state.stage);
  const view = piece ? (piece.endedAt !== undefined ? 'results' : 'live') : stage;

  // Each step starts at the top, like a new screen.
  useEffect(() => {
    document.querySelector('main')?.scrollTo(0, 0);
  }, [view]);

  if (piece) return view === 'results' ? <PieceResults piece={piece} /> : <PieceLive piece={piece} />;
  return stage === 'ready' ? <PieceReady /> : <PieceSetup />;
}
