import { beforeEach, describe, expect, it } from 'vitest';

import { createGetMyNotes } from '../../../../src/modules/coaching/application/useCases/getMyNotes.js';
import { createCreateNote } from '../../../../src/modules/coaching/application/useCases/createNote.js';

import { createFakeCoachNoteRepository, createFakePlayerEligibilityProvider } from './fakes.js';

describe('getMyNotes', () => {
  let coachNoteRepository;
  let getMyNotes;
  let createNote;

  beforeEach(() => {
    coachNoteRepository = createFakeCoachNoteRepository();
    getMyNotes = createGetMyNotes({ coachNoteRepository });
    createNote = createCreateNote({
      coachNoteRepository,
      playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['player-1'])),
    });
  });

  it('returns only PLAYER_VISIBLE notes for the given playerId', async () => {
    await createNote({
      playerId: 'player-1',
      noteType: 'TRAINING',
      visibility: 'PLAYER_VISIBLE',
      content: 'visible',
      coachUserId: 'coach-1',
    });

    const notes = await getMyNotes({ playerId: 'player-1' });
    expect(notes).toHaveLength(1);
    expect(notes[0].visibility).toBe('PLAYER_VISIBLE');
  });

  it('never returns PRIVATE notes, even when they exist for the same player', async () => {
    await createNote({
      playerId: 'player-1',
      noteType: 'TACTICAL',
      visibility: 'PRIVATE',
      content: 'secret coach note',
      coachUserId: 'coach-1',
    });
    await createNote({
      playerId: 'player-1',
      noteType: 'TRAINING',
      visibility: 'PLAYER_VISIBLE',
      content: 'visible',
      coachUserId: 'coach-1',
    });

    const notes = await getMyNotes({ playerId: 'player-1' });
    expect(notes.every((n) => n.visibility === 'PLAYER_VISIBLE')).toBe(true);
    expect(notes.some((n) => n.content === 'secret coach note')).toBe(false);
  });

  it('returns an empty array when there are no visible notes', async () => {
    expect(await getMyNotes({ playerId: 'player-1' })).toEqual([]);
  });
});
