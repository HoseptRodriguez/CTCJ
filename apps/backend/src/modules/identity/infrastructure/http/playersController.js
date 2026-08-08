import { mapIdentityError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapIdentityError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildIdentityContainer>} container */
export function createPlayersController(container) {
  const searchPlayers = asyncHandler(async (req, res) => {
    const result = await container.searchPlayers({ query: req.query.q });
    res.status(200).json(result);
  });

  return { searchPlayers };
}
