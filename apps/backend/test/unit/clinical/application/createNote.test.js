import { beforeEach, describe, expect, it } from 'vitest';

import { createCreateNote } from '../../../../src/modules/clinical/application/useCases/createNote.js';
import { PlayerNotEligible } from '../../../../src/modules/clinical/application/errors/PlayerNotEligible.js';

import { createFakeNoteRepository, createFakePlayerEligibilityProvider } from './fakes.js';

describe('createNote', () => {
  let noteRepository;
  let createNote;

  beforeEach(() => {
    noteRepository = createFakeNoteRepository();
    createNote = createCreateNote({
      noteRepository,
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['player-1'])),
    });
  });

  it('creates a note when the target holds JUGADOR', async () => {
    const note = await createNote({
      playerId: 'player-1',
      noteType: 'FOLLOW_UP',
      visibility: 'PRIVATE',
      content: 'Good progress this session.',
      practitionerUserId: 'psych-1',
    });

    expect(note).toMatchObject({
      playerId: 'player-1',
      practitionerId: 'psych-1',
      noteType: 'FOLLOW_UP',
      visibility: 'PRIVATE',
      content: 'Good progress this session.',
    });
  });

  it('throws PlayerNotEligible when the target does not hold JUGADOR', async () => {
    await expect(
      createNote({
        playerId: 'not-a-player',
        noteType: 'FOLLOW_UP',
        visibility: 'PRIVATE',
        content: 'x',
        practitionerUserId: 'psych-1',
      }),
    ).rejects.toThrow(PlayerNotEligible);
  });

  it.each(['FOLLOW_UP', 'RECOMMENDATION', 'SESSION_NOTE', 'GENERAL'])(
    'accepts noteType %s',
    async (noteType) => {
      const note = await createNote({
        playerId: 'player-1',
        noteType,
        visibility: 'PLAYER_VISIBLE',
        content: 'x',
        practitionerUserId: 'psych-1',
      });
      expect(note.noteType).toBe(noteType);
    },
  );

  it('optionally links the note to an appointment', async () => {
    const note = await createNote({
      playerId: 'player-1',
      noteType: 'SESSION_NOTE',
      visibility: 'PRIVATE',
      content: 'x',
      appointmentId: 'appt-1',
      practitionerUserId: 'psych-1',
    });
    expect(note.appointmentId).toBe('appt-1');
  });

  it('defaults appointmentId to null when not provided', async () => {
    const note = await createNote({
      playerId: 'player-1',
      noteType: 'GENERAL',
      visibility: 'PRIVATE',
      content: 'x',
      practitionerUserId: 'psych-1',
    });
    expect(note.appointmentId).toBeNull();
  });
});
