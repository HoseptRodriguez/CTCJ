import { describe, expect, it } from 'vitest';

import { computeStandings } from '../../../../src/modules/competition/domain/services/computeStandings.js';

const NAMES = new Map([
  ['p1', 'Ana Gomez'],
  ['p2', 'Beto Ruiz'],
  ['p3', 'Carla Diaz'],
  ['p4', 'Dario Leal'],
]);

function match({ winnerSide, setsWonA, setsWonB, participantsA, participantsB }) {
  return { winnerSide, setsWonA, setsWonB, participantsA, participantsB };
}

describe('computeStandings', () => {
  it('awards WIN/LOSS points per match, both sides get individual credit', () => {
    const rows = computeStandings(
      [
        match({
          winnerSide: 'A',
          setsWonA: 2,
          setsWonB: 0,
          participantsA: ['p1'],
          participantsB: ['p2'],
        }),
      ],
      NAMES,
    );

    const p1 = rows.find((r) => r.playerId === 'p1');
    const p2 = rows.find((r) => r.playerId === 'p2');
    expect(p1.points).toBe(2);
    expect(p2.points).toBe(0);
    expect(p1.setDiff).toBe(2);
    expect(p2.setDiff).toBe(-2);
  });

  it('doubles: both players on each side get individual credit regardless of partner', () => {
    const rows = computeStandings(
      [
        match({
          winnerSide: 'A',
          setsWonA: 2,
          setsWonB: 1,
          participantsA: ['p1', 'p2'],
          participantsB: ['p3', 'p4'],
        }),
      ],
      NAMES,
    );

    for (const id of ['p1', 'p2']) {
      expect(rows.find((r) => r.playerId === id).points).toBe(2);
    }
    for (const id of ['p3', 'p4']) {
      expect(rows.find((r) => r.playerId === id).points).toBe(0);
    }
  });

  it('ranks by points desc, then setDiff desc, then playerName alphabetically', () => {
    const rows = computeStandings(
      [
        // p1: 1 win (2 pts, +2 setDiff)
        match({
          winnerSide: 'A',
          setsWonA: 2,
          setsWonB: 0,
          participantsA: ['p1'],
          participantsB: ['p2'],
        }),
        // p3, p4: both 1 win each (2 pts) but different setDiff
        match({
          winnerSide: 'A',
          setsWonA: 2,
          setsWonB: 1,
          participantsA: ['p3'],
          participantsB: ['p4'],
        }),
      ],
      NAMES,
    );

    // p1 (+2 diff) and p3 (+1 diff) both have 2 points -- p1 ranks above p3.
    const ranks = Object.fromEntries(rows.map((r) => [r.playerId, r.rank]));
    expect(ranks.p1).toBeLessThan(ranks.p3);
  });

  it('breaks a full tie (same points, same setDiff) alphabetically by name', () => {
    const rows = computeStandings(
      [
        match({
          winnerSide: 'A',
          setsWonA: 2,
          setsWonB: 0,
          participantsA: ['p2'],
          participantsB: ['p1'],
        }),
      ],
      new Map([
        ['p1', 'Zeta'],
        ['p2', 'Alfa'],
      ]),
    );
    // p2 (Alfa) won, so it's already ahead on points -- construct a genuine
    // tie instead: two independent 1-0 wins for two different pairs with
    // identical points/setDiff.
    const tied = computeStandings(
      [
        match({
          winnerSide: 'A',
          setsWonA: 2,
          setsWonB: 0,
          participantsA: ['p2'],
          participantsB: ['p9'],
        }),
        match({
          winnerSide: 'A',
          setsWonA: 2,
          setsWonB: 0,
          participantsA: ['p1'],
          participantsB: ['p8'],
        }),
      ],
      new Map([
        ['p1', 'Zeta'],
        ['p2', 'Alfa'],
        ['p8', 'Loser Ocho'],
        ['p9', 'Loser Nueve'],
      ]),
    );
    const alfaRank = tied.find((r) => r.playerId === 'p2').rank;
    const zetaRank = tied.find((r) => r.playerId === 'p1').rank;
    expect(alfaRank).toBeLessThan(zetaRank);
    expect(rows.length).toBeGreaterThan(0); // sanity: first computation ran too
  });

  it('excludes players with zero matches (input already filtered to non-VOID)', () => {
    const rows = computeStandings([], NAMES);
    expect(rows).toEqual([]);
  });

  it('flags the top 8 as qualifying for Masters, no artificial floor below 8 players', () => {
    const matches = [
      match({
        winnerSide: 'A',
        setsWonA: 2,
        setsWonB: 0,
        participantsA: ['p1'],
        participantsB: ['p2'],
      }),
    ];
    const rows = computeStandings(matches, NAMES);
    // Only 2 players total -- both qualify, no floor requiring 8 real entrants.
    expect(rows.every((r) => r.qualifiesForMasters)).toBe(true);
  });

  it('rank 9 and below do not qualify for Masters when more than 8 players exist', () => {
    const matches = [];
    const names = new Map();
    for (let i = 1; i <= 9; i += 1) {
      const winnerId = `p${i}`;
      const loserId = `loser${i}`;
      names.set(winnerId, `Player ${String(i).padStart(2, '0')}`);
      names.set(loserId, `Loser ${i}`);
      matches.push(
        match({
          winnerSide: 'A',
          setsWonA: 2,
          setsWonB: 0,
          participantsA: [winnerId],
          participantsB: [loserId],
        }),
      );
    }
    const rows = computeStandings(matches, names);
    const winners = rows.filter((r) => r.points === 2).sort((a, b) => a.rank - b.rank);
    expect(winners).toHaveLength(9);
    expect(winners[7].qualifiesForMasters).toBe(true); // rank 8
    expect(winners[8].qualifiesForMasters).toBe(false); // rank 9
  });
});
