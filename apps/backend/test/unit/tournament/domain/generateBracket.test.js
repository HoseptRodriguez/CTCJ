import { describe, expect, it } from 'vitest';

import { generateBracket } from '../../../../src/modules/tournament/domain/services/generateBracket.js';

function ids(n) {
  return Array.from({ length: n }, (_, i) => `p${i + 1}`); // p1 = seed 1, p2 = seed 2, ...
}

function matchAt(bracket, round, slot) {
  return bracket.matches.find((m) => m.round === round && m.slot === slot);
}

describe('generateBracket', () => {
  it('exact power of 2 (4 participants): 2 rounds, no byes', () => {
    const bracket = generateBracket(ids(4));
    expect(bracket.bracketSize).toBe(4);
    expect(bracket.totalRounds).toBe(2);
    expect(bracket.matches.every((m) => !m.isBye)).toBe(true);
    // Standard seeding: round 1 is seed1 vs seed4, seed2 vs seed3.
    expect(matchAt(bracket, 1, 0)).toMatchObject({ participantAId: 'p1', participantBId: 'p4' });
    expect(matchAt(bracket, 1, 1)).toMatchObject({ participantAId: 'p2', participantBId: 'p3' });
  });

  it('8 participants: standard NCAA-style pairing (1v8, 4v5, 2v7, 3v6)', () => {
    const bracket = generateBracket(ids(8));
    expect(bracket.bracketSize).toBe(8);
    expect(bracket.totalRounds).toBe(3);
    expect(matchAt(bracket, 1, 0)).toMatchObject({ participantAId: 'p1', participantBId: 'p8' });
    expect(matchAt(bracket, 1, 1)).toMatchObject({ participantAId: 'p4', participantBId: 'p5' });
    expect(matchAt(bracket, 1, 2)).toMatchObject({ participantAId: 'p2', participantBId: 'p7' });
    expect(matchAt(bracket, 1, 3)).toMatchObject({ participantAId: 'p3', participantBId: 'p6' });
    // Seed 1 and seed 2 are in different halves -- they can only meet in the final (round 3).
  });

  it('3 participants: 4-slot bracket, 1 bye for the top seed', () => {
    const bracket = generateBracket(ids(3));
    expect(bracket.bracketSize).toBe(4);
    const byes = bracket.matches.filter((m) => m.isBye);
    expect(byes).toHaveLength(1);
    expect(byes[0]).toMatchObject({
      round: 1,
      participantAId: 'p1',
      participantBId: null,
      winnerParticipantId: 'p1',
    });
    // seed 2 vs seed 3 play a real round-1 match.
    expect(matchAt(bracket, 1, 1)).toMatchObject({
      participantAId: 'p2',
      participantBId: 'p3',
      isBye: false,
    });
    // The bye winner (seed 1) is already propagated into the final as participant A.
    expect(matchAt(bracket, 2, 0)).toMatchObject({ participantAId: 'p1', participantBId: null });
  });

  it('6 participants: 8-slot bracket, 2 byes for the top 2 seeds, no bye-bye collision', () => {
    const bracket = generateBracket(ids(6));
    expect(bracket.bracketSize).toBe(8);
    const byes = bracket.matches.filter((m) => m.isBye);
    expect(byes).toHaveLength(2);
    expect(byes.map((b) => b.winnerParticipantId).sort()).toEqual(['p1', 'p2']);
    // Round 2 slot 0 (fed by round-1 slots 0,1) has only the bye winner (p1)
    // propagated -- the other feeder (p4 vs p5) hasn't been played yet.
    expect(matchAt(bracket, 2, 0)).toMatchObject({ participantAId: 'p1', participantBId: null });
    // Round 2 slot 1 (fed by round-1 slots 2,3) has only p2's bye winner
    // propagated -- round-1 slot 3 (p3 vs p6) is a real, unplayed match.
    expect(matchAt(bracket, 2, 1)).toMatchObject({ participantAId: 'p2', participantBId: null });
  });

  it('5 participants: 8-slot bracket, 3 byes -- two byes feed the SAME round-2 match, which becomes immediately ready (not an error)', () => {
    // This is the case the design initially assumed couldn't happen. Traced
    // through by hand: seeds 1,2,3 get byes (byeCount=3). Standard seeding
    // pairs are (1v8),(4v5),(2v7),(3v6) -- with only 5 real participants,
    // seeds 6,7,8 don't exist, so round-1 slots 0,2,3 are all byes (seeds
    // 1, 2, 3), and slot 1 (seed4 vs seed5) is the only real round-1 match.
    // Round-2 slot 1 is fed by round-1 slots 2 and 3 -- BOTH byes (seed 2
    // and seed 3) -- so it gets both participants filled immediately.
    const bracket = generateBracket(ids(5));
    expect(bracket.bracketSize).toBe(8);
    const byes = bracket.matches.filter((m) => m.isBye);
    expect(byes).toHaveLength(3);
    expect(byes.map((b) => b.winnerParticipantId).sort()).toEqual(['p1', 'p2', 'p3']);

    // Round 2 slot 1: both feeders (round-1 slot 2 = p2's bye, slot 3 =
    // p3's bye) resolved instantly, so both participant slots are filled
    // right after generation -- ready to record immediately, no winner yet.
    const readySemifinal = matchAt(bracket, 2, 1);
    expect(readySemifinal.participantAId).not.toBeNull();
    expect(readySemifinal.participantBId).not.toBeNull();
    expect([readySemifinal.participantAId, readySemifinal.participantBId].sort()).toEqual([
      'p2',
      'p3',
    ]);
    expect(readySemifinal.winnerParticipantId).toBeNull();

    // Round 2 slot 0 is only half-fed (p1's bye propagated; p4-vs-p5 not yet played).
    expect(matchAt(bracket, 2, 0)).toMatchObject({ participantAId: 'p1', participantBId: null });
  });

  it('2 participants: bracket size 2, single final match, no byes', () => {
    const bracket = generateBracket(ids(2));
    expect(bracket.bracketSize).toBe(2);
    expect(bracket.totalRounds).toBe(1);
    expect(bracket.matches).toHaveLength(1);
    expect(bracket.matches[0]).toMatchObject({
      participantAId: 'p1',
      participantBId: 'p2',
      isBye: false,
    });
  });

  it('11 participants: 16-slot bracket, 5 byes, every match slot accounted for', () => {
    const bracket = generateBracket(ids(11));
    expect(bracket.bracketSize).toBe(16);
    expect(bracket.totalRounds).toBe(4);
    const byes = bracket.matches.filter((m) => m.isBye);
    expect(byes).toHaveLength(5);
    // Total matches across all rounds: 8 + 4 + 2 + 1 = 15.
    expect(bracket.matches).toHaveLength(15);
  });
});
