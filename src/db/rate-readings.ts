import { newId } from '../lib/id';
import type { StrokeCount } from '../lib/rate';
import { db } from './db';
import type { Ms, RateReading } from './types';

export async function saveRateReading(reading: { at: Ms; spm: number; strokes: StrokeCount }): Promise<RateReading> {
  const record: RateReading = { id: newId(), ...reading, updatedAt: Date.now() };
  await db.rateReadings.add(record);
  return record;
}
