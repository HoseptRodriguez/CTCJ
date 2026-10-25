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

  const listPlayerTournaments = asyncHandler(async (req, res) => {
    const tournaments = await container.listPlayerTournaments({ playerId: req.params.id });
    res.status(200).json({ tournaments });
  });

  const setPublicInfo = asyncHandler(async (req, res) => {
    const tournament = await container.setTournamentPublicInfo({
      tournamentId: req.params.id,
      startsOn: req.body.startsOn,
      endsOn: req.body.endsOn,
      publish: req.body.publish,
    });
    res.status(200).json(tournament);
  });

  const scheduleMatch = asyncHandler(async (req, res) => {
    const match = await container.scheduleMatch({
      tournamentId: req.params.id,
      matchId: req.params.matchId,
      scheduledAt: req.body.scheduledAt,
      courtName: req.body.courtName,
    });
    res.status(200).json(match);
  });

  const listPublicTournaments = asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.status(200).json(await container.listPublicTournaments());
  });

  const getPublicTournament = asyncHandler(async (req, res) => {
    res.set('Cache-Control', 'public, max-age=60');
    res.status(200).json(await container.getPublicTournament({ tournamentId: req.params.id }));
  });

  return {
    setPublicInfo,
    scheduleMatch,
    listPublicTournaments,
    getPublicTournament,
    listPlayerTournaments,
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
