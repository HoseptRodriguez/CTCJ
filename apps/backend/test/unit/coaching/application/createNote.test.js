import { beforeEach, describe, expect, it } from 'vitest';

import { createCreateNote } from '../../../../src/modules/coaching/application/useCases/createNote.js';
import { PlayerNotEligible } from '../../../../src/modules/coaching/application/errors/PlayerNotEligible.js';

import { createFakeCoachNoteRepository, createFakePlayerEligibilityProvider } from './fakes.js';

describe('createNote', () => {
  let coachNoteRepository;
  let createNote;

  beforeEach(() => {
    coachNoteRepository = createFakeCoachNoteRepository();
    createNote = createCreateNote({
      coachNoteRepository,
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['player-1'])),
    });
  });

  it('creates a note when the target holds JUGADOR', async () => {
    const note = await createNote({
      playerId: 'player-1',
      noteType: 'TRAINING',
      visibility: 'PRIVATE',
      content: 'Good footwork today.',
      coachUserId: 'coach-1',
    });

    expect(note).toMatchObject({
      playerId: 'player-1',
      coachId: 'coach-1',
      noteType: 'TRAINING',
      visibility: 'PRIVATE',
      content: 'Good footwork today.',
    });
  });

  it('throws PlayerNotEligible when the target does not hold JUGADOR', async () => {
    await expect(
      createNote({
        playerId: 'not-a-player',
        noteType: 'TRAINING',
        visibility: 'PRIVATE',
        content: 'x',
        coachUserId: 'coach-1',
      }),
    ).rejects.toThrow(PlayerNotEligible);
  });

  it.each(['TRAINING', 'TECHNICAL', 'TACTICAL', 'RECOMMENDATION'])(
    'accepts noteType %s',
    async (noteType) => {
      const note = await createNote({
        playerId: 'player-1',
        noteType,
        visibility: 'PLAYER_VISIBLE',
        content: 'x',
        coachUserId: 'coach-1',
      });
      expect(note.noteType).toBe(noteType);
    },
  );

  it.each(['PRIVATE', 'PLAYER_VISIBLE'])('accepts visibility %s', async (visibility) => {
    const note = await createNote({
      playerId: 'player-1',
      noteType: 'TRAINING',
      visibility,
      content: 'x',
      coachUserId: 'coach-1',
    });
    expect(note.visibility).toBe(visibility);
  });

  it('tags the note with a skill area when provided', async () => {
    const note = await createNote({
      playerId: 'player-1',
      noteType: 'TECHNICAL',
      visibility: 'PLAYER_VISIBLE',
      content: 'Work on your toss height.',
      area: 'SERVE',
      coachUserId: 'coach-1',
    });
    expect(note.area).toBe('SERVE');
  });

  it('defaults area to null when not provided', async () => {
    const note = await createNote({
      playerId: 'player-1',
      noteType: 'TRAINING',
      visibility: 'PRIVATE',
      content: 'x',
      coachUserId: 'coach-1',
    });
    expect(note.area).toBeNull();
  });
});
