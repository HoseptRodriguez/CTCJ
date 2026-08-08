import { prisma } from '../../../shared/prismaClient.js';
import { DEFAULT_CLUB_ID } from '../../../config/club.js';
import { systemClock } from '../application/ports/Clock.js';
import { createCreateSeason } from '../application/useCases/createSeason.js';
import { createCloseSeason } from '../application/useCases/closeSeason.js';
import { createListSeasons } from '../application/useCases/listSeasons.js';
import { createRecordMatch } from '../application/useCases/recordMatch.js';
import { createVoidMatch } from '../application/useCases/voidMatch.js';
import { createListMatches } from '../application/useCases/listMatches.js';
import { createGetStandings } from '../application/useCases/getStandings.js';
import { createGetMyCompetitionSummary } from '../application/useCases/getMyCompetitionSummary.js';
import { createGetRecentClubMatches } from '../application/useCases/getRecentClubMatches.js';
import { createRecordMatchForOpenSeason } from '../application/useCases/recordMatchForOpenSeason.js';

import { createPrismaSeasonRepository } from './persistence/prismaSeasonRepository.js';
import { createPrismaCompetitionMatchRepository } from './persistence/prismaCompetitionMatchRepository.js';
import {
  createNullPlayerEligibilityProvider,
  createNullPlayerDirectoryProvider,
} from './adapters/nullAdapters.js';

/**
 * Wires concrete infrastructure adapters to application use cases. Mirrors
 * billing's/coaching's compositionRoot.js exactly for consistency.
 *
 * `playerEligibilityProvider`/`playerDirectoryProvider` are optional,
 * cross-module dependencies -- app.js supplies the real ones, wired to
 * identity's application layer. Left unset (e.g. in a standalone/test
 * call), they default to null-object adapters matching each port's own
 * documented fail-closed/fail-open default.
 */
export function buildCompetitionContainer({
  prismaClient = prisma,
  clock = systemClock,
  clubId = DEFAULT_CLUB_ID,
  playerEligibilityProvider = createNullPlayerEligibilityProvider(),
  playerDirectoryProvider = createNullPlayerDirectoryProvider(),
} = {}) {
  const seasonRepository = createPrismaSeasonRepository(prismaClient);
  const competitionMatchRepository = createPrismaCompetitionMatchRepository(prismaClient);

  const recordMatch = createRecordMatch({
    seasonRepository,
    competitionMatchRepository,
    playerEligibilityProvider,
    clock,
  });

  return {
    createSeason: createCreateSeason({ seasonRepository, clock, clubId }),
    closeSeason: createCloseSeason({ seasonRepository, clock }),
    listSeasons: createListSeasons({ seasonRepository, clubId }),
    recordMatch,
    // Internal-only, no HTTP route -- see recordMatchForOpenSeason.js's own
    // docstring. Consumed cross-module by challenges' MatchRecorder adapter.
    recordMatchForOpenSeason: createRecordMatchForOpenSeason({
      seasonRepository,
      recordMatch,
      clubId,
    }),
    voidMatch: createVoidMatch({ competitionMatchRepository, clock }),
    listMatches: createListMatches({
      competitionMatchRepository,
      playerDirectoryProvider,
      seasonRepository,
      clubId,
    }),
    getStandings: createGetStandings({
      competitionMatchRepository,
      playerDirectoryProvider,
      seasonRepository,
      clubId,
    }),
    getMyCompetitionSummary: createGetMyCompetitionSummary({
      competitionMatchRepository,
      playerDirectoryProvider,
      seasonRepository,
      clubId,
    }),
    getRecentClubMatches: createGetRecentClubMatches({
      competitionMatchRepository,
      playerDirectoryProvider,
      seasonRepository,
      clubId,
    }),
  };
}
