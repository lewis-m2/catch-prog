// Crew helpers (SPEC §4b). Pure functions.

import {
  GRADES,
  normaliseBoatClass,
  normaliseGender,
  normaliseGrade,
  normaliseProgram,
  PROGRAM_LABEL,
  programsWithGrade,
  type Gender,
  type Program,
  type ProgramSetting,
} from './programme';

export interface CrewDraft {
  name: string;
  program: Program;
  boatClass: string;
  gender: Gender;
  grade: string;
}

export interface QuickAddError {
  line: number;
  text: string;
  message: string;
}

/**
 * Parses quick-add lines: `name, boat class, gender, grade`, with an optional
 * fifth column `school` or `club`. Without it, the programme comes from the
 * setting; with `both`, from the grade (and `whenBoth` for Novice, which both
 * programmes have).
 */
export function parseQuickAdd(
  text: string,
  setting: ProgramSetting,
  whenBoth: Program,
  existingNames: string[] = [],
): { crews: CrewDraft[]; errors: QuickAddError[] } {
  const crews: CrewDraft[] = [];
  const errors: QuickAddError[] = [];
  const taken = new Set(existingNames.map((name) => name.trim().toLowerCase()));

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (line === '') return;
    const error = (message: string) => errors.push({ line: index + 1, text: line, message });

    const cells = line.split(/[,\t]/).map((cell) => cell.trim());
    if (cells.length < 4 || cells.length > 5) return error('Needs: name, boat class, gender, grade');
    const [name, boatText, genderText, gradeText, programText] = cells as [string, string, string, string, string?];

    if (name === '') return error('Missing the crew name');
    if (taken.has(name.toLowerCase())) return error(`There's already a crew called "${name}"`);
    const boatClass = normaliseBoatClass(boatText);
    if (!boatClass) return error(`Unknown boat class "${boatText}"`);
    const gender = normaliseGender(genderText);
    if (!gender) return error(`Gender must be W or M, not "${genderText}"`);

    let program: Program | null;
    if (programText !== undefined) {
      program = normaliseProgram(programText);
      if (!program) return error(`Programme must be school or club, not "${programText}"`);
    } else if (setting !== 'both') {
      program = setting;
    } else {
      const options = programsWithGrade(gradeText);
      program = options.length === 1 ? options[0]! : options.length > 1 ? whenBoth : null;
    }
    const grade = program ? normaliseGrade(program, gradeText) : null;
    if (!program || !grade) {
      const valid = program ? GRADES[program].join(', ') : 'a School or Club grade';
      return error(`"${gradeText}" isn't ${program ? `a ${PROGRAM_LABEL[program]} grade (${valid})` : valid}`);
    }

    taken.add(name.toLowerCase());
    crews.push({ name, program, boatClass, gender, grade });
  });

  return { crews, errors };
}

/** Short description of a crew's event, e.g. `8+ · W · U17`. */
export function describeEvent(crew: { boatClass: string; gender: Gender; grade: string }): string {
  return `${crew.boatClass} · ${crew.gender} · ${crew.grade}`;
}

export function sortByName<T extends { name: string }>(crews: T[]): T[] {
  return [...crews].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
}
