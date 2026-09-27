import express from 'express';
import { describe, expect, it } from 'vitest';

import { toProblemDetail } from '../../../src/shared/errors/httpError.js';
import { assertUtf8Body, toBodyParserHttpError } from '../../../src/shared/utf8Body.js';

// Same wiring as app.js: the UTF-8 check on express.json() and the error mapping.
function createTestApp() {
  const app = express();
  app.use(express.json({ verify: assertUtf8Body }));
  app.post('/eco', (req, res) => res.json(req.body));
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    const { status, body } = toProblemDetail(toBodyParserHttpError(err));
    res.status(status).json(body);
  });
  return app;
}

// A real request with the exact bytes (supertest re-encodes Buffers sent as JSON).
async function post(raw) {
  const server = createTestApp().listen(0);
  try {
    const res = await fetch(`http://127.0.0.1:${server.address().port}/eco`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: raw,
    });
    return { status: res.status, body: await res.json() };
  } finally {
    server.close();
  }
}

describe('JSON bodies must be valid UTF-8', () => {
  it('keeps accents and ñ intact when the body is UTF-8', async () => {
    const res = await post(Buffer.from('{"name":"Iniciación ñ ¿sábado?"}', 'utf8'));
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Iniciación ñ ¿sábado?');
  });

  it('refuses a Windows-1252 body instead of storing "Iniciaci�n"', async () => {
    const res = await post(Buffer.from('{"name":"Iniciación"}', 'latin1'));
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_encoding');
  });

  it('answers malformed JSON with 400, not 500', async () => {
    const res = await post('{"name": ');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('invalid_json');
  });
});
