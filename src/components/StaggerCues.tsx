import { useEffect, useRef } from 'react';
import { useHaptics } from '../hooks/useHaptics';
import { useNow } from '../hooks/useNow';
import { predictedFinishMs } from '../lib/stagger-piece';
import { useStagger } from '../state/stagger';

/**
 * Vibration cues during a staggered piece, on any tab (SPEC §5c): a short buzz
 * at 3, 2 and 1 seconds before each crew is due, a long one at its GO, and for
 * a time piece, at the end. Renders nothing.
 *
 * A cue only fires inside a short window after its moment, so reopening the app
 * mid-piece doesn't replay missed cues.
 */
export function StaggerCues() {
  const piece = useStagger((state) => state.piece);
  const live = piece !== null && piece.endedAt === undefined;
  const now = useNow(live);
  const haptics = useHaptics();
  const fired = useRef(new Set<string>());

  useEffect(() => {
    if (!piece || piece.endedAt !== undefined) return;
    const fire = (key: string, cue: () => void) => {
      if (fired.current.has(key)) return;
      fired.current.add(key);
      cue();
    };

    for (const entry of piece.entries) {
      // The first crew goes on START, and a crew the coach already sent needs no cue.
      if (entry.offsetSec === 0 || entry.actualStartAt !== undefined) continue;
      const toGo = piece.startedAt + entry.offsetSec * 1000 - now;
      for (const n of [3, 2, 1]) {
        if (toGo <= n * 1000 && toGo > n * 1000 - 700) fire(`${piece.id}:${entry.crewId}:${n}`, haptics.count);
      }
      if (toGo <= 0 && toGo > -1000) fire(`${piece.id}:${entry.crewId}:go`, haptics.go);
    }

    if (piece.type === 'time') {
      const sinceEnd = now - piece.startedAt - predictedFinishMs(piece);
      if (sinceEnd >= 0 && sinceEnd < 1000) fire(`${piece.id}:time`, haptics.go);
    }
  }, [piece, now, haptics]);

  return null;
}
