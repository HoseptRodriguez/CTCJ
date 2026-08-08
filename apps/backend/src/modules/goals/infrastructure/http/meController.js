import { mapGoalsError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapGoalsError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildGoalsContainer>} container */
export function createMeController(container) {
  const createGoal = asyncHandler(async (req, res) => {
    const goal = await container.createGoal({
      playerId: req.user.id,
      title: req.body.title,
      metricType: req.body.metricType,
      targetArea: req.body.targetArea,
      targetValue: req.body.targetValue,
      targetCategory: req.body.targetCategory,
      targetModality: req.body.targetModality,
    });
    res.status(201).json(goal);
  });

  const getMyGoals = asyncHandler(async (req, res) => {
    const result = await container.getMyGoals({ playerId: req.user.id });
    res.status(200).json(result);
  });

  const abandonGoal = asyncHandler(async (req, res) => {
    const goal = await container.abandonGoal({
      playerId: req.user.id,
      goalId: req.params.id,
    });
    res.status(200).json(goal);
  });

  return { createGoal, getMyGoals, abandonGoal };
}
