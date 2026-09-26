import { AREA_LABELS } from './performanceRatingLabels.js';

/** The 10 skills, in the radar's clockwise order. */
export const SKILL_AREAS = Object.keys(AREA_LABELS);

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Per skill: the latest rating now, and the rating that was current
 * `daysAgo` days ago (the latest one recorded on or before that date).
 * Areas never rated are null. `ratings`: [{ area, rating, recordedAt }].
 */
export function compareWithPast(ratings, { now = new Date(), daysAgo = 90 } = {}) {
  const cutoff = now.getTime() - daysAgo * DAY_MS;
  const result = {};
  for (const area of SKILL_AREAS) {
    const rows = ratings
      .filter((r) => r.area === area)
      .sort((a, b) => new Date(a.recordedAt) - new Date(b.recordedAt));
    const past = rows.filter((r) => new Date(r.recordedAt).getTime() <= cutoff).at(-1);
    result[area] = { now: rows.at(-1)?.rating ?? null, past: past?.rating ?? null };
  }
  return result;
}

/**
 * The skill that improved most since then (needs both values and a gain),
 * and the skill to work on (the lowest current rating; ties -> first in
 * SKILL_AREAS order). Either may be null.
 */
export function highlights(comparison) {
  let mostImproved = null;
  let toWorkOn = null;
  for (const area of SKILL_AREAS) {
    const { now, past } = comparison[area];
    if (now != null && past != null && now - past > 0) {
      if (!mostImproved || now - past > mostImproved.gain)
        mostImproved = { area, gain: now - past };
    }
    if (now != null && (!toWorkOn || now < toWorkOn.rating)) toWorkOn = { area, rating: now };
  }
  return { mostImproved, toWorkOn };
}
