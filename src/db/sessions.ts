import { db } from './db';
import type { Piece, Session } from './types';

/** The session that hasn't been ended (if any), and the piece on its piece clock. */
export async function loadActiveSession(): Promise<{ session: Session | null; piece: Piece | null }> {
  const latest = await db.sessions.orderBy('startedAt').last();
  if (!latest || latest.endedAt !== undefined) return { session: null, piece: null };
  const piece = latest.currentPieceId ? await db.pieces.get(latest.currentPieceId) : undefined;
  return { session: latest, piece: piece?.kind === 'simple' ? piece : null };
}

/** Saves records together: either all are written or none are. */
export function saveTimerRecords(records: { session?: Session; piece?: Piece }): Promise<void> {
  return db.transaction('rw', db.sessions, db.pieces, async () => {
    if (records.session) await db.sessions.put(records.session);
    if (records.piece) await db.pieces.put(records.piece);
  });
}

/** Asks the browser not to clear our data when the phone is low on space. */
export async function requestPersistentStorage(): Promise<void> {
  if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
    await navigator.storage.persist();
  }
}
