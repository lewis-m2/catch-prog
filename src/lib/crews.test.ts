import { describe, expect, it } from 'vitest';
import { parseQuickAdd, sortByName } from './crews';
import { activePrograms, normaliseBoatClass, normaliseGender, seatsFor } from './programme';

describe('parseQuickAdd', () => {
  it('reads the SPEC example line', () => {
    const { crews, errors } = parseQuickAdd('Girls U17 8+ A, 8+, W, U17', 'school', 'school');
    expect(errors).toEqual([]);
    expect(crews).toEqual([{ name: 'Girls U17 8+ A', program: 'school', boatClass: '8+', gender: 'W', grade: 'U17' }]);
  });

  it('reads several lines, skipping blanks, and accepts tabs and loose spelling', () => {
    const { crews, errors } = parseQuickAdd('Boys U16 4x+\t4X+\tboys\tu16\n\nGirls Nov 8+, 8+, girls, novice', 'school', 'school');
    expect(errors).toEqual([]);
    expect(crews.map((c) => [c.boatClass, c.gender, c.grade])).toEqual([
      ['4x+', 'M', 'U16'],
      ['8+', 'W', 'Novice'],
    ]);
  });

  it('rejects a grade from the other programme, with the valid ones listed', () => {
    const { crews, errors } = parseQuickAdd('Senior men, 8+, M, Senior', 'school', 'school');
    expect(crews).toEqual([]);
    expect(errors[0]).toMatchObject({ line: 1 });
    expect(errors[0]!.message).toContain('U15');
  });

  it('with both programmes, takes the programme from the grade, and from the choice for Novice', () => {
    const { crews } = parseQuickAdd('A, 8+, M, Senior\nB, 8+, M, U17\nC, 8+, M, Novice', 'both', 'club');
    expect(crews.map((c) => c.program)).toEqual(['club', 'school', 'club']);
  });

  it('a fifth column sets the programme', () => {
    expect(parseQuickAdd('A, 8+, W, Novice, club', 'school', 'school').crews[0]!.program).toBe('club');
  });

  it('reports bad lines and duplicate names, and still adds the good ones', () => {
    const { crews, errors } = parseQuickAdd(
      ['Good, 8+, W, U17', 'Good, 8+, W, U16', 'Existing crew, 1x, M, U18', 'Bad boat, 3x, W, U17', 'Short, 8+'].join('\n'),
      'school',
      'school',
      ['existing CREW'],
    );
    expect(crews.map((c) => c.name)).toEqual(['Good']);
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4, 5]);
  });
});

describe('programme helpers', () => {
  it('lists the active programmes for a setting', () => {
    expect(activePrograms('school')).toEqual(['school']);
    expect(activePrograms('both')).toEqual(['school', 'club']);
  });

  it('normalises boat classes and genders', () => {
    expect(normaliseBoatClass(' 4X+ ')).toBe('4x+');
    expect(normaliseBoatClass('3x')).toBeNull();
    expect(normaliseGender('Girls')).toBe('W');
    expect(normaliseGender('M')).toBe('M');
    expect(normaliseGender('x')).toBeNull();
  });

  it('names the seats, cox first then stroke to bow', () => {
    expect(seatsFor('8+')).toEqual(['Cox', 'Stroke', '7', '6', '5', '4', '3', '2', 'Bow']);
    expect(seatsFor('4x')).toEqual(['Stroke', '3', '2', 'Bow']);
    expect(seatsFor('2-')).toEqual(['Stroke', 'Bow']);
    expect(seatsFor('1x')).toEqual(['Sculler']);
  });
});

it('sortByName puts crew numbers in order', () => {
  expect(sortByName([{ name: 'Crew 10' }, { name: 'crew 2' }, { name: 'Crew 1' }]).map((c) => c.name)).toEqual([
    'Crew 1',
    'crew 2',
    'Crew 10',
  ]);
});
