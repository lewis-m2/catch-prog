import Dexie, { type EntityTable } from 'dexie';
import type { RateReading } from './types';

// The IndexedDB database. To change the schema, add a new `version(n)` below
// rather than editing an existing one, so data on phones is upgraded in place.
export const db = new Dexie('launch') as Dexie & {
  rateReadings: EntityTable<RateReading, 'id'>;
};

db.version(1).stores({
  // Primary key first, then the fields we query by.
  rateReadings: 'id, at, sessionId, crewId, pieceId',
});
