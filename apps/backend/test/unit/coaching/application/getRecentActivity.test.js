import { describe, expect, it } from 'vitest';

import { createGetRecentActivity } from '../../../../src/modules/coaching/application/useCases/getRecentActivity.js';

import {
  createFakeCoachNoteRepository,
  createFakePerformanceRatingRepository,
  createFakePlayerDirectoryProvider,
} from './fakes.js';

describe('getRecentActivity', () => {
  it('merges recent notes and ratings into one feed sorted newest-first', async () => {
    const coachNoteRepository = createFakeCoachNoteRepository();
    const performanceRatingRepository = createFakePerformanceRatingRepository();

    const note = await coachNoteRepository.create({
      playerId: 'player-1',
      coachId: 'coach-1',
      noteType: 'TRAINING',
      visibility: 'PRIVATE',
      content: 'Great session.',
      area: 'SERVE',
    });
    performanceRatingRepository._seed({
      playerId: 'player-2',
      coachId: 'coach-1',
      area: 'FOREHAND',
      rating: 7,
      recordedAt: new Date(Date.now() + 1000),
    });

    const getRecentActivity = createGetRecentActivity({
      coachNoteRepository,
      performanceRatingRepository,
      playerDirectoryProvider: createFakePlayerDirectoryProvider(
        new Map([
          ['player-1', { firstName: 'Ana', lastName: 'Ruiz' }],
          ['player-2', { firstName: 'Luis', lastName: 'Perez' }],
        ]),
      ),
    });

    const { activity } = await getRecentActivity({ limit: 10 });

    expect(activity).toHaveLength(2);
    expect(activity[0]).toMatchObject({
      type: 'RATING',
      playerId: 'player-2',
      playerName: 'Luis Perez',
      area: 'FOREHAND',
      rating: 7,
    });
    expect(activity[1]).toMatchObject({
      id: `note-${note.id}`,
      type: 'NOTE',
      playerId: 'player-1',
      playerName: 'Ana Ruiz',
      noteType: 'TRAINING',
      area: 'SERVE',
    });
  });

  it('caps the merged feed at the requested limit', async () => {
    const coachNoteRepository = createFakeCoachNoteRepository();
    const performanceRatingRepository = createFakePerformanceRatingRepository();

    for (let i = 0; i < 5; i += 1) {
      await coachNoteRepository.create({
        playerId: 'player-1',
        coachId: 'coach-1',
        noteType: 'TRAINING',
        visibility: 'PRIVATE',
        content: `note ${i}`,
      });
    }

    const getRecentActivity = createGetRecentActivity({
      coachNoteRepository,
      performanceRatingRepository,
      playerDirectoryProvider: createFakePlayerDirectoryProvider(),
    });

    const { activity } = await getRecentActivity({ limit: 3 });

    expect(activity).toHaveLength(3);
  });

  it('falls back to a null playerName when the player directory has no match', async () => {
    const coachNoteRepository = createFakeCoachNoteRepository();
    const performanceRatingRepository = createFakePerformanceRatingRepository();

    await coachNoteRepository.create({
      playerId: 'unknown-player',
      coachId: 'coach-1',
      noteType: 'TRAINING',
      visibility: 'PRIVATE',
      content: 'x',
    });

    const getRecentActivity = createGetRecentActivity({
      coachNoteRepository,
      performanceRatingRepository,
      playerDirectoryProvider: createFakePlayerDirectoryProvider(),
    });

    const { activity } = await getRecentActivity();

    expect(activity[0].playerName).toBeNull();
  });
});
