import defaultCsv from './prognostics-default.csv?raw';
import { parsePrognosticCsv, type ProgEntry } from '../lib/prognostic';

/** The built-in tables, bundled into the app (so they work offline). */
export const DEFAULT_PROGNOSTICS: ProgEntry[] = parsePrognosticCsv(defaultCsv).rows;
