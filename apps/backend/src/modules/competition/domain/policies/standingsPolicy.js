/**
 * Points-per-match standings table. The source requirements doc doesn't
 * specify point values -- this is a deliberate, simple, easy-to-change
 * default (a common amateur-league scheme: win counts, loss doesn't), named
 * here as a constant rather than a magic number scattered through code.
 */
export const COMPETITION_POINTS = Object.freeze({ WIN: 2, LOSS: 0 });

/** Top-N standings positions that qualify for the end-of-season Masters,
 * computed live from current standings (not gated on season-closed). */
export const MASTERS_QUALIFYING_SLOTS = 8;
