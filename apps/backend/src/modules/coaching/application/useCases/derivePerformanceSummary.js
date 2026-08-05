/**
 * Pure computation over a player's full rating history, shared by
 * listPlayerPerformance.js (staff) and getMyPerformance.js (self-service) --
 * both need the identical derived shape, so it isn't duplicated.
 *
 * Resolves the real doc's five dashboard concepts explicitly rather than
 * leaving them to be invented ad hoc in the UI later:
 *   - "Technical evolution" is the raw history itself (returned separately
 *     by the caller, not part of this summary).
 *   - "Strengths"/"Weaknesses"/"Areas for improvement" all derive from
 *     `ratedAreas`, sorted by latest rating descending (ties broken
 *     alphabetically by area for determinism) -- the highest end reads as
 *     strengths, the lowest end as weaknesses/areas for improvement. Which
 *     cutoff (top 3, bottom 2, etc.) to actually display is a presentation
 *     decision left to the frontend, not hardcoded here.
 *   - "Progress" is the delta between an area's latest and immediately
 *     previous rating -- only present for areas with >= 2 ratings.
 *
 * An area with zero ratings is never defaulted to 0 -- it's simply absent
 * from `ratedAreas`/`latestByArea`/`progressByArea`. Reporting a
 * never-rated area as a "weakness" would be actively wrong, not just
 * incomplete.
 *
 * @param {import('../ports/PerformanceRatingRepository.js').PerformanceRatingRow[]} rows
 * @returns {{
 *   ratedAreas: string[],
 *   latestByArea: Record<string, number>,
 *   progressByArea: Record<string, number>,
 * }}
 */
export function derivePerformanceSummary(rows) {
  const byArea = new Map();
  for (const row of rows) {
    if (!byArea.has(row.area)) byArea.set(row.area, []);
    byArea.get(row.area).push(row);
  }

  const latestByArea = {};
  const progressByArea = {};

  for (const [area, areaRows] of byArea) {
    const sorted = [...areaRows].sort((a, b) => a.recordedAt - b.recordedAt);
    const latest = sorted[sorted.length - 1];
    latestByArea[area] = latest.rating;
    if (sorted.length >= 2) {
      const previous = sorted[sorted.length - 2];
      progressByArea[area] = latest.rating - previous.rating;
    }
  }

  const ratedAreas = Object.keys(latestByArea).sort((a, b) => {
    const diff = latestByArea[b] - latestByArea[a];
    return diff !== 0 ? diff : a.localeCompare(b);
  });

  return { ratedAreas, latestByArea, progressByArea };
}
