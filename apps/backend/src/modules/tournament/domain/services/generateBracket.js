function nextPowerOfTwo(n) {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

/**
 * Standard recursive tournament-seeding order: for a bracket of `size`
 * slots, returns an array where index i holds the seed number (1-indexed)
 * placed at slot i. Guarantees seed 1 and seed 2 can only meet in the
 * final, seeds 1-4 can't meet before the semifinal, etc. -- the same
 * construction real single-elimination tournaments use.
 */
function buildSeedOrder(size) {
  if (size === 1) return [1];
  const prev = buildSeedOrder(size / 2);
  const order = [];
  for (const s of prev) {
    order.push(s);
    order.push(size + 1 - s);
  }
  return order;
}

/**
 * Pure function: given a list of participant ids already sorted by seed
 * (index 0 = seed 1), returns the full bracket structure -- every round's
 * matches, with round-1 byes auto-resolved and their winners already
 * propagated into round 2.
 *
 * A "seed number" beyond the real participant count represents a bye slot
 * (no participant). Because the seeding order always pairs a real low seed
 * against the highest available seed number, byes land on the top seeds
 * first with no special-cased bye-assignment logic needed -- it falls out
 * of the seeding construction itself.
 *
 * Note: when there are enough byes that BOTH round-1 matches feeding the
 * same round-2 slot are byes (e.g. 5 participants in an 8-slot bracket:
 * seeds 1, 2, 3 all get byes -- seeds 2 and 3's byes both feed round-2 slot
 * 1), that round-2 match becomes immediately ready-to-record right after
 * generation (both participants known from round 1, no result yet) rather
 * than "awaiting a feeder." This is a real, valid tournament outcome, not
 * an error case.
 *
 * @param {string[]} seededParticipantIds
 * @returns {{ bracketSize: number, totalRounds: number, matches: Array<{
 *   round: number, slot: number, participantAId: string|null,
 *   participantBId: string|null, winnerParticipantId: string|null, isBye: boolean
 * }> }}
 */
export function generateBracket(seededParticipantIds) {
  const n = seededParticipantIds.length;
  const bracketSize = nextPowerOfTwo(n);
  const totalRounds = Math.log2(bracketSize);
  const seedOrder = buildSeedOrder(bracketSize);

  function participantForSeed(seedNumber) {
    return seedNumber <= n ? seededParticipantIds[seedNumber - 1] : null;
  }

  const byKey = new Map();
  const key = (round, slot) => `${round}-${slot}`;

  // Round 1: pair up the seed order, resolving byes immediately.
  const round1MatchCount = bracketSize / 2;
  for (let slot = 0; slot < round1MatchCount; slot += 1) {
    const participantAId = participantForSeed(seedOrder[slot * 2]);
    const participantBId = participantForSeed(seedOrder[slot * 2 + 1]);
    const isBye = participantAId == null || participantBId == null;
    const winnerParticipantId = isBye ? (participantAId ?? participantBId) : null;
    byKey.set(key(1, slot), {
      round: 1,
      slot,
      participantAId,
      participantBId,
      winnerParticipantId,
      isBye,
    });
  }

  // Rounds 2+: empty placeholders, filled in below as earlier rounds resolve.
  for (let round = 2; round <= totalRounds; round += 1) {
    const matchCount = bracketSize / 2 ** round;
    for (let slot = 0; slot < matchCount; slot += 1) {
      byKey.set(key(round, slot), {
        round,
        slot,
        participantAId: null,
        participantBId: null,
        winnerParticipantId: null,
        isBye: false,
      });
    }
  }

  // Propagate resolved winners forward, round by round (processing in
  // increasing round order means a chain of byes -- were one ever
  // possible -- would cascade correctly; in practice byes only ever
  // originate in round 1).
  for (let round = 1; round < totalRounds; round += 1) {
    const matchCount = bracketSize / 2 ** round;
    for (let slot = 0; slot < matchCount; slot += 1) {
      const match = byKey.get(key(round, slot));
      if (match.winnerParticipantId == null) continue;
      const nextRound = round + 1;
      const nextSlot = Math.floor(slot / 2);
      const nextMatch = byKey.get(key(nextRound, nextSlot));
      if (slot % 2 === 0) {
        nextMatch.participantAId = match.winnerParticipantId;
      } else {
        nextMatch.participantBId = match.winnerParticipantId;
      }
    }
  }

  return {
    bracketSize,
    totalRounds,
    matches: [...byKey.values()].sort((a, b) => a.round - b.round || a.slot - b.slot),
  };
}
