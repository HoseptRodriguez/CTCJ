import { describe, expect, it } from 'vitest';

import { createMatchRecorderAdapter } from '../../../../src/modules/challenges/infrastructure/adapters/matchRecorderAdapter.js';
import { MatchRecordingUnavailable } from '../../../../src/modules/challenges/application/errors/MatchRecordingUnavailable.js';
import { PlayerNotEligible } from '../../../../src/modules/challenges/application/errors/PlayerNotEligible.js';

function withCode(code) {
  return Object.assign(new Error(code), { code });
}

describe('matchRecorderAdapter', () => {
  it('delegates to recordMatchForOpenSeason and returns its result unchanged on success', async () => {
    const match = { id: 'match-1' };
    const adapter = createMatchRecorderAdapter({
      recordMatchForOpenSeason: async (input) => ({ ...match, input }),
    });

    const result = await adapter.recordConfirmedMatch({ category: 'CUARTA' });
    expect(result.id).toBe('match-1');
  });

  it("translates competition's no_open_season into challenges' MatchRecordingUnavailable", async () => {
    const adapter = createMatchRecorderAdapter({
      recordMatchForOpenSeason: async () => {
        throw withCode('no_open_season');
      },
    });

    await expect(adapter.recordConfirmedMatch({})).rejects.toThrow(MatchRecordingUnavailable);
  });

  it("translates competition's player_not_eligible into challenges' own PlayerNotEligible", async () => {
    const adapter = createMatchRecorderAdapter({
      recordMatchForOpenSeason: async () => {
        throw withCode('player_not_eligible');
      },
    });

    await expect(adapter.recordConfirmedMatch({})).rejects.toThrow(PlayerNotEligible);
  });

  it('rethrows any other error unchanged', async () => {
    class SomeOtherError extends Error {}
    const adapter = createMatchRecorderAdapter({
      recordMatchForOpenSeason: async () => {
        throw new SomeOtherError('boom');
      },
    });

    await expect(adapter.recordConfirmedMatch({})).rejects.toThrow(SomeOtherError);
  });
});
