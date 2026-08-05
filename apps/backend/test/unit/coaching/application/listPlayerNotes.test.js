import { beforeEach, describe, expect, it } from 'vitest';

import { createListPlayerNotes } from '../../../../src/modules/coaching/application/useCases/listPlayerNotes.js';
import { createCreateNote } from '../../../../src/modules/coaching/application/useCases/createNote.js';

import { createFakeCoachNoteRepository, createFakePlayerEligibilityProvider } from './fakes.js';

describe('listPlayerNotes', () => {
  let coachNoteRepository;
  let listPlayerNotes;
  let createNote;

  beforeEach(() => {
    coachNoteRepository = createFakeCoachNoteRepository();
    listPlayerNotes = createListPlayerNotes({ coachNoteRepository });
    createNote = createCreateNote({
      coachNoteRepository,
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['player-1'])),
    });
  });

  it('returns every note for a player regardless of visibility', async () => {
    await createNote({
      playerId: 'player-1',
      noteType: 'TRAINING',
      visibility: 'PRIVATE',
      content: 'private one',
      coachUserId: 'coach-1',
    });
    await createNote({
      playerId: 'player-1',
      noteType: 'RECOMMENDATION',
      visibility: 'PLAYER_VISIBLE',
      content: 'visible one',
      coachUserId: 'coach-1',
    });

    const notes = await listPlayerNotes({ playerId: 'player-1' });
    expect(notes).toHaveLength(2);
    expect(notes.map((n) => n.visibility).sort()).toEqual(['PLAYER_VISIBLE', 'PRIVATE']);
  });

  it('returns an empty array for a player with no notes', async () => {
    expect(await listPlayerNotes({ playerId: 'player-1' })).toEqual([]);
  });
});
