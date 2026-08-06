import { beforeEach, describe, expect, it } from 'vitest';

import { createListPlayerNotes } from '../../../../src/modules/clinical/application/useCases/listPlayerNotes.js';

import { createFakeNoteRepository } from './fakes.js';

describe('listPlayerNotes', () => {
  let noteRepository;
  let listPlayerNotes;

  beforeEach(() => {
    noteRepository = createFakeNoteRepository();
    listPlayerNotes = createListPlayerNotes({ noteRepository });
  });

  it('returns every note for the player regardless of visibility', async () => {
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

    const result = await listPlayerNotes({ playerId: 'player-1' });
    expect(result.notes).toHaveLength(2);
  });

  it('returns an empty list for a player with no notes', async () => {
    const result = await listPlayerNotes({ playerId: 'player-1' });
    expect(result.notes).toEqual([]);
  });
});
