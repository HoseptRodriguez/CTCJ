import { describe, expect, it } from 'vitest';

import { errorForLog } from '../../../src/shared/logger.js';

describe('errorForLog', () => {
  it('a database error keeps its type and code, never the query values', () => {
    const err = new Error(
      'Invalid `prisma.clinicalNote.create()` invocation: { content: "Ansiedad antes de los partidos" }',
    );
    err.name = 'PrismaClientKnownRequestError';
    err.code = 'P2002';
    err.meta = { target: ['player_id'] };
    const logged = errorForLog(err);
    expect(logged).toEqual({
      type: 'PrismaClientKnownRequestError',
      code: 'P2002',
      target: ['player_id'],
    });
    expect(JSON.stringify(logged)).not.toContain('Ansiedad');
  });

  it('other errors keep their own message and stack', () => {
    const logged = errorForLog(new TypeError('x is not a function'));
    expect(logged).toMatchObject({ type: 'TypeError', message: 'x is not a function' });
    expect(logged.stack).toContain('TypeError');
  });
});
