import { Writable } from 'node:stream';

import express from 'express';
import pino from 'pino';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { httpLogOptions } from '../../../src/shared/logger.js';

// Same wiring as app.js, with the log lines captured in memory.
function appWithCapturedLogs() {
  const lines = [];
  const sink = new Writable({
    write(chunk, _enc, done) {
      lines.push(chunk.toString());
      done();
    },
  });
  const logger = pino({ level: 'info' }, sink);
  const app = express();
  app.use(pinoHttp({ logger, ...httpLogOptions }));
  app.get('/api/auth/verify-email', (_req, res) =>
    res.cookie('ctcj_refresh', 'SECRETO-DE-RESPUESTA').json({ ok: true }),
  );
  return { app, lines };
}

describe('request logs never contain session tokens', () => {
  it('no Authorization, no cookie, no set-cookie and no query-string token', async () => {
    const { app, lines } = appWithCapturedLogs();
    await request(app)
      .get('/api/auth/verify-email?token=TOKEN-DE-UN-SOLO-USO')
      .set('Authorization', 'Bearer ACCESO-SECRETO')
      .set('Cookie', 'ctcj_refresh=REFRESCO-SECRETO')
      .set('User-Agent', 'NavegadorDePrueba')
      .expect(200);

    const logged = lines.join('\n');
    expect(logged).not.toBe('');
    for (const secret of [
      'ACCESO-SECRETO',
      'REFRESCO-SECRETO',
      'SECRETO-DE-RESPUESTA',
      'TOKEN-DE-UN-SOLO-USO',
      'NavegadorDePrueba',
    ]) {
      expect(logged).not.toContain(secret);
    }
    // What diagnosing needs is still there.
    const entry = JSON.parse(lines.at(-1));
    expect(entry.req).toMatchObject({ method: 'GET', path: '/api/auth/verify-email' });
    expect(entry.res).toEqual({ statusCode: 200 });
  });
});
