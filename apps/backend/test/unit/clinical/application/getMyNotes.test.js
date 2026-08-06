import { beforeEach, describe, expect, it } from 'vitest';

import { createGetMyNotes } from '../../../../src/modules/clinical/application/useCases/getMyNotes.js';

import { createFakeNoteRepository } from './fakes.js';

describe('getMyNotes', () => {
  let noteRepository;
  let getMyNotes;

  beforeEach(() => {
    noteRepository = createFakeNoteRepository();
    getMyNotes = createGetMyNotes({ noteRepository });
  });

  it('returns only PLAYER_VISIBLE notes, never PRIVATE ones', async () => {
    await noteRepository.create({
      playerId: 'player-1',
      practitionerId: 'psych-1',
      noteType: 'FOLLOW_UP',
      visibility: 'PRIVATE',
      content: 'private note',
    });
    await noteRepository.create({
      playerId: 'player-1',
      practitionerId: 'psych-1',
      noteType: 'RECOMMENDATION',
      visibility: 'PLAYER_VISIBLE',
      content: 'visible note',
    });

    const result = await getMyNotes({ playerId: 'player-1' });
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].visibility).toBe('PLAYER_VISIBLE');
    expect(result.notes.some((n) => n.content === 'private note')).toBe(false);
  });
});
