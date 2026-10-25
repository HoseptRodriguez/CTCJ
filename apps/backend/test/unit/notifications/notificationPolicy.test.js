import { describe, expect, it } from 'vitest';
import {
  EMAIL_NOTIFICATION_TYPES,
  NOTIFICATION_TYPE,
  classifyNotification,
  colombianHolidays,
  isWithinServiceHours,
  nextAllowedSendTime,
} from '@ctcj/shared';

const next = (iso, kind) => nextAllowedSendTime(new Date(iso), kind).toISOString();
const club = (local) => new Date(`${local}-05:00`).toISOString();

describe('service or promotional (Ley 2300 de 2023)', () => {
  it.each([
    ['COACH_NOTE_PUBLISHED', 'SERVICE', 'RESULTS_NOTES'],
    ['PERFORMANCE_RECORDED', 'SERVICE', 'RESULTS_NOTES'],
    ['TOURNAMENT_DRAW_PUBLISHED', 'SERVICE', 'MY_TOURNAMENTS'],
    ['TOURNAMENT_MATCH_CHANGED', 'SERVICE', 'MY_TOURNAMENTS'],
    ['TOURNAMENT_MATCH_RESULT', 'SERVICE', 'MY_TOURNAMENTS'],
    ['TOURNAMENT_CANCELLED', 'SERVICE', 'MY_TOURNAMENTS'],
    ['PLAN_PRICE_CHANGED', 'SERVICE', 'ACCOUNT'],
    ['TOURNAMENT_OPENED', 'PROMOTIONAL', 'NEW_TOURNAMENTS'],
  ])('%s is %s (%s)', (type, kind, category) => {
    expect(classifyNotification(type)).toEqual({ kind, category });
  });

  it('an announcement is what the club says it is', () => {
    expect(classifyNotification('ANNOUNCEMENT', { announcementKind: 'SERVICE' })).toEqual({
      kind: 'SERVICE',
      category: 'CLUB_NOTICES',
    });
    expect(classifyNotification('ANNOUNCEMENT', { announcementKind: 'PROMOTIONAL' })).toEqual({
      kind: 'PROMOTIONAL',
      category: 'PROMOTIONS',
    });
    expect(() => classifyNotification('ANNOUNCEMENT')).toThrow(/kind/);
  });

  it('every type is classified; challenges and comments stay inside the app', () => {
    for (const type of Object.values(NOTIFICATION_TYPE)) {
      const options = type === 'ANNOUNCEMENT' ? { announcementKind: 'SERVICE' } : {};
      expect(() => classifyNotification(type, options)).not.toThrow();
    }
    expect(EMAIL_NOTIFICATION_TYPES).not.toContain('CHALLENGE_RECEIVED');
    expect(EMAIL_NOTIFICATION_TYPES).toContain('TOURNAMENT_DRAW_PUBLISHED');
    expect(() => classifyNotification('NOPE')).toThrow();
  });
});

describe('sending hours', () => {
  it('service: any day from 7:00 a. m. to 9:00 p. m.', () => {
    expect(isWithinServiceHours(club('2026-10-04T07:00:00'))).toBe(true); // domingo
    expect(isWithinServiceHours(club('2026-10-12T20:59:00'))).toBe(true); // festivo
    expect(isWithinServiceHours(club('2026-10-05T21:00:00'))).toBe(false);
    expect(isWithinServiceHours(club('2026-10-05T06:59:00'))).toBe(false);
  });

  it('service outside hours waits for 7:00 a. m.', () => {
    expect(next(club('2026-10-05T22:30:00'), 'SERVICE')).toBe(club('2026-10-06T07:00:00'));
    expect(next(club('2026-10-05T05:10:00'), 'SERVICE')).toBe(club('2026-10-05T07:00:00'));
    expect(next(club('2026-10-05T12:00:00'), 'SERVICE')).toBe(club('2026-10-05T12:00:00'));
  });

  it('promotional: inside the window it goes now', () => {
    expect(next(club('2026-10-05T18:59:00'), 'PROMOTIONAL')).toBe(club('2026-10-05T18:59:00'));
    expect(next(club('2026-10-03T14:00:00'), 'PROMOTIONAL')).toBe(club('2026-10-03T14:00:00'));
  });

  it('promotional: weekday evening -> next morning 7:00; before 7:00 -> same day', () => {
    expect(next(club('2026-10-06T19:00:00'), 'PROMOTIONAL')).toBe(club('2026-10-07T07:00:00'));
    expect(next(club('2026-10-06T06:00:00'), 'PROMOTIONAL')).toBe(club('2026-10-06T07:00:00'));
  });

  it('promotional: Friday night -> Saturday 8:00; Saturday afternoon -> Monday 7:00', () => {
    expect(next(club('2026-10-02T20:00:00'), 'PROMOTIONAL')).toBe(club('2026-10-03T08:00:00'));
    expect(next(club('2026-10-03T15:00:00'), 'PROMOTIONAL')).toBe(club('2026-10-05T07:00:00'));
  });

  it('promotional: never Sunday or a holiday (Monday 12 Oct 2026 is Día de la Raza)', () => {
    expect(colombianHolidays(2026)).toContain('2026-10-12');
    expect(next(club('2026-10-10T16:00:00'), 'PROMOTIONAL')).toBe(club('2026-10-13T07:00:00'));
    expect(next(club('2026-10-11T10:00:00'), 'PROMOTIONAL')).toBe(club('2026-10-13T07:00:00'));
  });

  it('promotional: Holy Week (Jueves and Viernes Santo 2027) and Christmas', () => {
    // Easter 2027 is 28 March: Jueves Santo 25, Viernes Santo 26.
    expect(next(club('2027-03-24T20:00:00'), 'PROMOTIONAL')).toBe(club('2027-03-27T08:00:00'));
    expect(next(club('2026-12-24T19:30:00'), 'PROMOTIONAL')).toBe(club('2026-12-26T08:00:00'));
  });
});
