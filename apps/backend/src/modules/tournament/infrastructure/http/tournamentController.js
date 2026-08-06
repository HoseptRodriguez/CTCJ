import { mapTournamentError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapTournamentError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildTournamentContainer>} container */
export function createTournamentController(container) {
  const listTournaments = asyncHandler(async (req, res) => {
    const tournaments = await container.listTournaments();
    res.status(200).json({ tournaments });
  });

  const createTournament = asyncHandler(async (req, res) => {
    const tournament = await container.createTournament({
      name: req.body.name,
      category: req.body.category,
      modality: req.body.modality,
      createdByUserId: req.user.id,
    });
    res.status(201).json(tournament);
  });

  const getTournament = asyncHandler(async (req, res) => {
    const result = await container.getTournament({ tournamentId: req.params.id });
    res.status(200).json(result);
  });

  const addParticipant = asyncHandler(async (req, res) => {
    const participant = await container.addParticipant({
      tournamentId: req.params.id,
      playerIds: req.body.playerIds,
      registeredByUserId: req.user.id,
    });
    res.status(201).json(participant);
  });

  const removeParticipant = asyncHandler(async (req, res) => {
    await container.removeParticipant({
      tournamentId: req.params.id,
      participantId: req.params.participantId,
    });
    res.status(204).send();
  });

  const generateDraw = asyncHandler(async (req, res) => {
    const tournament = await container.generateDraw({ tournamentId: req.params.id });
    res.status(200).json(tournament);
  });

  const recordMatchResult = asyncHandler(async (req, res) => {
    const match = await container.recordMatchResult({
      matchId: req.params.matchId,
      setsWonA: req.body.setsWonA,
      setsWonB: req.body.setsWonB,
      winnerSide: req.body.winnerSide,
      playedAt: new Date(req.body.playedAt),
      notes: req.body.notes,
      recordedByUserId: req.user.id,
    });
    res.status(200).json(match);
  });

  const cancelTournament = asyncHandler(async (req, res) => {
    const tournament = await container.cancelTournament({ tournamentId: req.params.id });
    res.status(200).json(tournament);
  });

  return {
    listTournaments,
    createTournament,
    getTournament,
    addParticipant,
    removeParticipant,
    generateDraw,
    recordMatchResult,
    cancelTournament,
  };
}
