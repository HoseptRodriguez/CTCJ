import { mapCompetitionError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapCompetitionError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildCompetitionContainer>} container */
export function createCompetitionController(container) {
  const listSeasons = asyncHandler(async (req, res) => {
    const seasons = await container.listSeasons();
    res.status(200).json({ seasons });
  });

  const createSeason = asyncHandler(async (req, res) => {
    const season = await container.createSeason({
      name: req.body.name,
      year: req.body.year,
      seasonNumber: req.body.seasonNumber,
      startDate: new Date(req.body.startDate),
      createdByUserId: req.user.id,
    });
    res.status(201).json(season);
  });

  const closeSeason = asyncHandler(async (req, res) => {
    const season = await container.closeSeason({
      seasonId: req.params.id,
      closedByUserId: req.user.id,
    });
    res.status(200).json(season);
  });

  const getStandings = asyncHandler(async (req, res) => {
    const standings = await container.getStandings({
      seasonId: req.query.seasonId,
      category: req.query.category,
      modality: req.query.modality,
    });
    res.status(200).json({ standings });
  });

  const listMatches = asyncHandler(async (req, res) => {
    const matches = await container.listMatches({
      seasonId: req.query.seasonId,
      category: req.query.category,
      modality: req.query.modality,
      playerId: req.query.playerId,
    });
    res.status(200).json({ matches });
  });

  const recordMatch = asyncHandler(async (req, res) => {
    const match = await container.recordMatch({
      seasonId: req.body.seasonId,
      category: req.body.category,
      modality: req.body.modality,
      participantsA: req.body.participantsA,
      participantsB: req.body.participantsB,
      winnerSide: req.body.winnerSide,
      setsWonA: req.body.setsWonA,
      setsWonB: req.body.setsWonB,
      playedAt: new Date(req.body.playedAt),
      notes: req.body.notes,
      recordedByUserId: req.user.id,
    });
    res.status(201).json(match);
  });

  const getMyCompetitionSummary = asyncHandler(async (req, res) => {
    const matchLimit = req.query.matchLimit ? Number(req.query.matchLimit) : undefined;
    const summary = await container.getMyCompetitionSummary({
      playerId: req.user.id,
      matchLimit,
    });
    res.status(200).json(summary);
  });

  const voidMatch = asyncHandler(async (req, res) => {
    const match = await container.voidMatch({
      matchId: req.params.id,
      reason: req.body.reason,
      voidedByUserId: req.user.id,
    });
    res.status(200).json(match);
  });

  return {
    listSeasons,
    createSeason,
    closeSeason,
    getStandings,
    listMatches,
    getMyCompetitionSummary,
    recordMatch,
    voidMatch,
  };
}
