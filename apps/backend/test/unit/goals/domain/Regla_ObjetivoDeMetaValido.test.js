import { describe, expect, it } from 'vitest';

import { validateGoalTarget } from '../../../../src/modules/goals/domain/policies/goalTargetPolicy.js';
import { InvalidGoalTarget } from '../../../../src/modules/goals/domain/errors/InvalidGoalTarget.js';

describe('validateGoalTarget', () => {
  it('rejects a missing/blank title regardless of metricType', () => {
    expect(() => validateGoalTarget({ metricType: 'CUSTOM', title: '' })).toThrow(
      InvalidGoalTarget,
    );
    expect(() => validateGoalTarget({ metricType: 'CUSTOM', title: '   ' })).toThrow(
      InvalidGoalTarget,
    );
  });

  it('CUSTOM needs only a title', () => {
    expect(() =>
      validateGoalTarget({ metricType: 'CUSTOM', title: 'Reach Category 2' }),
    ).not.toThrow();
  });

  describe('SKILL_RATING', () => {
    it('requires a valid targetArea and a 1-10 targetValue', () => {
      expect(() =>
        validateGoalTarget({
          metricType: 'SKILL_RATING',
          title: 'x',
          targetArea: 'SERVE',
          targetValue: 8,
        }),
      ).not.toThrow();
    });

    it('rejects an invalid targetArea', () => {
      expect(() =>
        validateGoalTarget({
          metricType: 'SKILL_RATING',
          title: 'x',
          targetArea: 'NOT_A_REAL_AREA',
          targetValue: 8,
        }),
      ).toThrow(InvalidGoalTarget);
    });

    it.each([0, 11, 1.5, undefined])('rejects an out-of-range targetValue (%s)', (targetValue) => {
      expect(() =>
        validateGoalTarget({
          metricType: 'SKILL_RATING',
          title: 'x',
          targetArea: 'SERVE',
          targetValue,
        }),
      ).toThrow(InvalidGoalTarget);
    });
  });

  describe('MATCH_WINS / RANKING_POSITION / TRAINING_FREQUENCY', () => {
    it.each(['MATCH_WINS', 'RANKING_POSITION', 'TRAINING_FREQUENCY'])(
      '%s requires a positive integer targetValue',
      (metricType) => {
        expect(() => validateGoalTarget({ metricType, title: 'x', targetValue: 10 })).not.toThrow();
        expect(() => validateGoalTarget({ metricType, title: 'x', targetValue: 0 })).toThrow(
          InvalidGoalTarget,
        );
        expect(() =>
          validateGoalTarget({ metricType, title: 'x', targetValue: undefined }),
        ).toThrow(InvalidGoalTarget);
      },
    );
  });

  it('rejects an unknown metricType', () => {
    expect(() => validateGoalTarget({ metricType: 'NOT_REAL', title: 'x' })).toThrow(
      InvalidGoalTarget,
    );
  });
});
