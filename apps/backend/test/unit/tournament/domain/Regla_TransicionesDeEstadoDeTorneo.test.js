import { describe, expect, it } from 'vitest';

import { Tournament } from '../../../../src/modules/tournament/domain/entities/Tournament.js';
import { InvalidTournamentState } from '../../../../src/modules/tournament/domain/errors/InvalidTournamentState.js';
import { NotEnoughParticipants } from '../../../../src/modules/tournament/domain/errors/NotEnoughParticipants.js';

function buildTournament() {
  return Tournament.create({
    id: 't1',
    clubId: 'club-1',
    name: 'Torneo de prueba',
    category: 'CUARTA',
    modality: 'SINGLES',
    createdBy: 'admin-1',
    now: new Date('2026-01-01'),
  });
}

describe('Regla: transiciones de estado de torneo', () => {
  it('a new tournament starts DRAFT', () => {
    const t = buildTournament();
    expect(t.status).toBe('DRAFT');
  });

  it('generateDraw() is legal from DRAFT with >= 2 participants', () => {
    const t = buildTournament();
    const now = new Date('2026-01-05');
    t.generateDraw({ participantCount: 4, now });
    expect(t.status).toBe('DRAW_GENERATED');
    expect(t.drawGeneratedAt).toBe(now);
  });

  it('generateDraw() throws NotEnoughParticipants with fewer than 2', () => {
    const t = buildTournament();
    expect(() => t.generateDraw({ participantCount: 1, now: new Date() })).toThrow(
      NotEnoughParticipants,
    );
  });

  it('generateDraw() throws when not DRAFT', () => {
    const t = buildTournament();
    t.generateDraw({ participantCount: 4, now: new Date('2026-01-05') });
    expect(() => t.generateDraw({ participantCount: 4, now: new Date() })).toThrow(
      InvalidTournamentState,
    );
  });

  it('complete() is legal from DRAW_GENERATED and sets championId', () => {
    const t = buildTournament();
    t.generateDraw({ participantCount: 4, now: new Date('2026-01-05') });
    const now = new Date('2026-01-10');
    t.complete({ championId: 'participant-1', now });
    expect(t.status).toBe('COMPLETED');
    expect(t.completedAt).toBe(now);
    expect(t.championId).toBe('participant-1');
  });

  it('complete() throws when not DRAW_GENERATED', () => {
    const t = buildTournament();
    expect(() => t.complete({ championId: 'x', now: new Date() })).toThrow(InvalidTournamentState);
  });

  it('cancel() is legal from DRAFT', () => {
    const t = buildTournament();
    const now = new Date('2026-01-02');
    t.cancel({ now });
    expect(t.status).toBe('CANCELLED');
    expect(t.cancelledAt).toBe(now);
  });

  it('cancel() is legal from DRAW_GENERATED', () => {
    const t = buildTournament();
    t.generateDraw({ participantCount: 4, now: new Date('2026-01-05') });
    t.cancel({ now: new Date('2026-01-06') });
    expect(t.status).toBe('CANCELLED');
  });

  it('cancel() throws when already COMPLETED', () => {
    const t = buildTournament();
    t.generateDraw({ participantCount: 4, now: new Date('2026-01-05') });
    t.complete({ championId: 'x', now: new Date('2026-01-10') });
    expect(() => t.cancel({ now: new Date() })).toThrow(InvalidTournamentState);
  });

  it('assertDraft() is a no-op while DRAFT', () => {
    const t = buildTournament();
    expect(() => t.assertDraft('addParticipant')).not.toThrow();
  });

  it('assertDraft() throws once the draw has been generated', () => {
    const t = buildTournament();
    t.generateDraw({ participantCount: 4, now: new Date('2026-01-05') });
    expect(() => t.assertDraft('addParticipant')).toThrow(InvalidTournamentState);
  });

  it('assertDrawGenerated() throws while still DRAFT', () => {
    const t = buildTournament();
    expect(() => t.assertDrawGenerated('recordMatchResult')).toThrow(InvalidTournamentState);
  });

  it('assertDrawGenerated() is a no-op once the draw exists', () => {
    const t = buildTournament();
    t.generateDraw({ participantCount: 4, now: new Date('2026-01-05') });
    expect(() => t.assertDrawGenerated('recordMatchResult')).not.toThrow();
  });
});
