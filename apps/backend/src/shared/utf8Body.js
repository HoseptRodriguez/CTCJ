import { HttpError } from './errors/httpError.js';

const strictUtf8 = new TextDecoder('utf-8', { fatal: true });

/**
 * `verify` hook for express.json(): refuses a body that is not valid UTF-8.
 *
 * Without it, a body sent in Windows-1252 (the Windows console, PowerShell
 * 5.1) is decoded leniently and every accented letter is silently stored as
 * the replacement character U+FFFD ("Iniciación" -> "Iniciaci?n" with a
 * black diamond). Better a clear 400 than damaged data.
 */
export function assertUtf8Body(_req, _res, buf) {
  try {
    strictUtf8.decode(buf);
  } catch {
    throw new HttpError(
      400,
      'invalid_encoding',
      'El texto enviado no está en UTF-8. Revisa la codificación e inténtalo de nuevo.',
    );
  }
}

/** Body-parser failures (bad JSON, body too large) as 4xx problem details instead of 500. */
export function toBodyParserHttpError(err) {
  if (err instanceof HttpError || !err?.type?.startsWith('entity.')) return err;
  if (err.type === 'entity.too.large') {
    return new HttpError(413, 'payload_too_large', 'El contenido enviado es demasiado grande.');
  }
  return new HttpError(400, 'invalid_json', 'El contenido enviado no es un JSON válido.');
}
