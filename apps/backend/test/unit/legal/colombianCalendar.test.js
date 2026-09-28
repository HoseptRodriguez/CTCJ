import { describe, expect, it } from 'vitest';
import {
  addBusinessDays,
  businessDaysBetween,
  clubDateOf,
  colombianHolidays,
  easterSunday,
  isBusinessDay,
  isWithinMarketingHours,
} from '@ctcj/shared';

describe('Colombian calendar', () => {
  it('Easter Sunday', () => {
    expect(easterSunday(2026).toISOString().slice(0, 10)).toBe('2026-04-05');
    expect(easterSunday(2027).toISOString().slice(0, 10)).toBe('2027-03-28');
  });

  it('the 18 holidays of 2026, with the Ley Emiliani moves', () => {
    expect(colombianHolidays(2026)).toEqual([
      '2026-01-01',
      '2026-01-12', // Reyes (6 ene, martes -> lunes 12)
      '2026-03-23', // San José
      '2026-04-02', // Jueves Santo
      '2026-04-03', // Viernes Santo
      '2026-05-01',
      '2026-05-18', // Ascensión
      '2026-06-08', // Corpus Christi
      '2026-06-15', // Sagrado Corazón
      '2026-06-29', // San Pedro y San Pablo (ya es lunes)
      '2026-07-20',
      '2026-08-07',
      '2026-08-17', // Asunción
      '2026-10-12', // Día de la Raza (ya es lunes)
      '2026-11-02', // Todos los Santos
      '2026-11-16', // Independencia de Cartagena
      '2026-12-08',
      '2026-12-25',
    ]);
  });

  it('business days skip weekends and holidays', () => {
    expect(isBusinessDay('2026-10-09')).toBe(true); // viernes
    expect(isBusinessDay('2026-10-10')).toBe(false); // sábado
    expect(isBusinessDay('2026-10-12')).toBe(false); // festivo
    // Friday + 1 business day = Tuesday (Monday 12 Oct is a holiday).
    expect(addBusinessDays('2026-10-09', 1)).toBe('2026-10-13');
    // A consulta received on Mon 28 Sep 2026: 10 business days -> Tue 13 Oct.
    expect(addBusinessDays('2026-09-28', 10)).toBe('2026-10-13');
    // A reclamo received the same day: 15 business days -> Tue 20 Oct.
    expect(addBusinessDays('2026-09-28', 15)).toBe('2026-10-20');
    // Holy Week.
    expect(addBusinessDays('2026-04-01', 1)).toBe('2026-04-06');
  });

  it('counts the business days left (negative once overdue)', () => {
    expect(businessDaysBetween('2026-09-28', '2026-10-13')).toBe(10);
    expect(businessDaysBetween('2026-10-13', '2026-10-13')).toBe(0);
    expect(businessDaysBetween('2026-10-15', '2026-10-13')).toBe(-2);
  });

  it('club date is Colombia time (UTC-5)', () => {
    expect(clubDateOf(new Date('2026-09-29T03:00:00Z'))).toBe('2026-09-28');
    expect(clubDateOf(new Date('2026-09-29T05:00:00Z'))).toBe('2026-09-29');
  });

  it('promotional hours (Ley 2300 de 2023)', () => {
    const at = (iso) => isWithinMarketingHours(new Date(iso));
    expect(at('2026-09-28T07:00:00-05:00')).toBe(true); // lunes 7:00
    expect(at('2026-09-28T06:59:00-05:00')).toBe(false);
    expect(at('2026-09-28T19:00:00-05:00')).toBe(false); // lunes 7:00 p. m.
    expect(at('2026-10-03T14:59:00-05:00')).toBe(true); // sábado
    expect(at('2026-10-03T15:00:00-05:00')).toBe(false);
    expect(at('2026-10-04T10:00:00-05:00')).toBe(false); // domingo
    expect(at('2026-10-12T10:00:00-05:00')).toBe(false); // festivo
  });
});
