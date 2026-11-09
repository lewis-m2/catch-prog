import Dexie, { type EntityTable } from 'dexie';
import type { AnyPiece, Crew, PrognosticOverride, RateReading, Session } from './types';

// The IndexedDB database. To change the schema, add a new `version(n)` below
// rather than editing an existing one, so data on phones is upgraded in place.
export const db = new Dexie('launch') as Dexie & {
  rateReadings: EntityTable<RateReading, 'id'>;
  sessions: EntityTable<Session, 'id'>;
  /** Simple and staggered pieces; `kind` tells them apart. */
  pieces: EntityTable<AnyPiece, 'id'>;
  crews: EntityTable<Crew, 'id'>;
  prognosticOverrides: EntityTable<PrognosticOverride, 'id'>;
};

// Each line lists the primary key first, then the fields we look things up by.
db.version(1).stores({
  rateReadings: 'id, at, sessionId, crewId, pieceId',
});
db.version(2).stores({
  sessions: 'id, startedAt',
  pieces: 'id, sessionId, startedAt',
});
db.version(3).stores({
  crews: 'id, name',
  // &key: unique, so an event can only have one edit.
  prognosticOverrides: 'id, &key, program',
});
db.version(4).stores({
  // kind: find staggered pieces (for "last used" times) without reading every piece.
  pieces: 'id, sessionId, startedAt, kind',
});
