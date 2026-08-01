/**
 * Decodes a JWT's payload for display purposes only (e.g. reading `roles`
 * after a silent refresh, which -- unlike login -- doesn't return them in
 * its response body). This is a plain base64 decode, NOT a signature
 * verification: never use the result for an authorization decision. The
 * server independently re-validates the token's signature on every request.
 */
export function decodeJwtPayload(token) {
  try {
    const [, payloadSegment] = token.split('.');
    const normalized = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}
