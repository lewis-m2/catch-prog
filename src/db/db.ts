import Dexie, { type EntityTable } from 'dexie';
import type { Piece, RateReading, Session } from './types';

// The IndexedDB database. To change the schema, add a new `version(n)` below
// rather than editing an existing one, so data on phones is upgraded in place.
export const db = new Dexie('launch') as Dexie & {
  rateReadings: EntityTable<RateReading, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  pieces: EntityTable<Piece, 'id'>;
};

// Each line lists the primary key first, then the fields we look things up by.
db.version(1).stores({
  rateReadings: 'id, at, sessionId, crewId, pieceId',
});
db.version(2).stores({
  sessions: 'id, startedAt',
  pieces: 'id, sessionId, startedAt',
});
