// Programmes, grades, boat classes and seats (SPEC §4, §7a). Pure functions.

export type Program = 'school' | 'club';
export type ProgramSetting = Program | 'both';
export type Gender = 'M' | 'W';

export const PROGRAMS: Program[] = ['school', 'club'];

export const PROGRAM_LABEL: Record<Program, string> = { school: 'School', club: 'Club' };

/** School = Maadi grades; Club = NZ Championships grades. Fastest last within each. */
export const GRADES: Record<Program, readonly string[]> = {
  school: ['Novice', 'U15', 'U16', 'U17', 'U18'],
  club: ['Novice', 'Intermediate', 'Club', 'Senior', 'Premier'],
};

/** Big boats first, as a coach usually lists them. */
export const BOAT_CLASSES = ['8+', '4+', '4-', '4x+', '4x', '2-', '2x', '1x'] as const;

export const GENDER_LABEL: Record<Gender, string> = { W: 'Women', M: 'Men' };

/** The programmes whose tables and grades are in use. */
export function activePrograms(setting: ProgramSetting | null): Program[] {
  if (setting === null || setting === 'both') return PROGRAMS;
  return [setting];
}

export function normaliseProgram(text: string): Program | null {
  const value = text.trim().toLowerCase();
  return value === 'school' || value === 'club' ? value : null;
}

/** `4X+` → `4x+`. Null if it isn't a boat class the app knows. */
export function normaliseBoatClass(text: string): string | null {
  const value = text.trim().toLowerCase().replace(/\s+/g, '');
  return (BOAT_CLASSES as readonly string[]).includes(value) ? value : null;
}

/** Accepts W/M, F, and the words women/men/girls/boys. */
export function normaliseGender(text: string): Gender | null {
  const value = text.trim().toLowerCase();
  if (['w', 'f', 'women', 'woman', 'girls', 'girl', 'female'].includes(value)) return 'W';
  if (['m', 'men', 'man', 'boys', 'boy', 'male'].includes(value)) return 'M';
  return null;
}

/** The grade as the programme spells it (`u17` → `U17`). Null if it isn't one of that programme's grades. */
export function normaliseGrade(program: Program, text: string): string | null {
  const value = text.trim().toLowerCase();
  return GRADES[program].find((grade) => grade.toLowerCase() === value) ?? null;
}

/** The programmes that have a grade with this name (Novice is in both). */
export function programsWithGrade(text: string): Program[] {
  return PROGRAMS.filter((program) => normaliseGrade(program, text) !== null);
}

/** Seat names for a boat, cox first, then stroke down to bow. */
export function seatsFor(boatClass: string): string[] {
  const rowers = Number.parseInt(boatClass, 10);
  if (!Number.isInteger(rowers) || rowers < 1) return [];
  if (rowers === 1) return ['Sculler'];
  const seats = ['Stroke'];
  for (let seat = rowers - 1; seat >= 2; seat--) seats.push(String(seat));
  seats.push('Bow');
  return boatClass.includes('+') ? ['Cox', ...seats] : seats;
}
