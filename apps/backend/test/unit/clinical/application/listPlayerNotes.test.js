import { beforeEach, describe, expect, it } from 'vitest';

import { createListPlayerNotes } from '../../../../src/modules/clinical/application/useCases/listPlayerNotes.js';
import { PractitionerNotEligible } from '../../../../src/modules/clinical/application/errors/PractitionerNotEligible.js';

import { createFakeNoteRepository, createFakePractitionerEligibilityProvider } from './fakes.js';

describe('listPlayerNotes', () => {
  let noteRepository;
  let listPlayerNotes;

  beforeEach(() => {
    noteRepository = createFakeNoteRepository();
    listPlayerNotes = createListPlayerNotes({
      noteRepository,
      practitionerEligibilityProvider: createFakePractitionerEligibilityProvider(
        new Map([
          ['psych-1', 'PSYCHOLOGY'],
          ['physio-1', 'PHYSIOTHERAPY'],
        ]),
      ),
    });
  });

  it("returns every note for the player within the caller's discipline, regardless of visibility", async () => {
    await noteRepository.create({
      playerId: 'player-1',
      practitionerId: 'psych-1',
      discipline: 'PSYCHOLOGY',
      noteType: 'FOLLOW_UP',
      visibility: 'PRIVATE',
      content: 'private note',
    });
    await noteRepository.create({
      playerId: 'player-1',
      practitionerId: 'psych-1',
      discipline: 'PSYCHOLOGY',
      noteType: 'RECOMMENDATION',
      visibility: 'PLAYER_VISIBLE',
      content: 'visible note',
    });

    const result = await listPlayerNotes({ playerId: 'player-1', practitionerUserId: 'psych-1' });
    expect(result.notes).toHaveLength(2);
  });

  it("never returns another discipline's notes -- a Fisioterapeuta cannot see Psychology notes", async () => {
    await noteRepository.create({
      playerId: 'player-1',
      practitionerId: 'psych-1',
      discipline: 'PSYCHOLOGY',
      noteType: 'FOLLOW_UP',
      visibility: 'PLAYER_VISIBLE',
      content: 'psychology note',
    });
    await noteRepository.create({
      playerId: 'player-1',
      practitionerId: 'physio-1',
      discipline: 'PHYSIOTHERAPY',
      noteType: 'GENERAL',
      visibility: 'PLAYER_VISIBLE',
      content: 'physio note',
    });

    const result = await listPlayerNotes({ playerId: 'player-1', practitionerUserId: 'physio-1' });
    expect(result.notes).toHaveLength(1);
    expect(result.notes[0].content).toBe('physio note');
  });

  it('returns an empty list for a player with no notes in that discipline', async () => {
    const result = await listPlayerNotes({ playerId: 'player-1', practitionerUserId: 'psych-1' });
    expect(result.notes).toEqual([]);
  });

  it('throws PractitionerNotEligible when the caller holds no clinical practitioner role', async () => {
    await expect(
      listPlayerNotes({ playerId: 'player-1', practitionerUserId: 'not-a-practitioner' }),
    ).rejects.toThrow(PractitionerNotEligible);
  });
});
