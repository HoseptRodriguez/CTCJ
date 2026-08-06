import { prisma } from '../../../shared/prismaClient.js';
import { DEFAULT_CLUB_ID } from '../../../config/club.js';
import { systemClock } from '../application/ports/Clock.js';
import { createCreateTournament } from '../application/useCases/createTournament.js';
import { createAddParticipant } from '../application/useCases/addParticipant.js';
import { createRemoveParticipant } from '../application/useCases/removeParticipant.js';
import { createGenerateDraw } from '../application/useCases/generateDraw.js';
import { createRecordMatchResult } from '../application/useCases/recordMatchResult.js';
import { createGetTournament } from '../application/useCases/getTournament.js';
import { createListTournaments } from '../application/useCases/listTournaments.js';
import { createCancelTournament } from '../application/useCases/cancelTournament.js';

import { createPrismaTournamentRepository } from './persistence/prismaTournamentRepository.js';
import {
  createNullPlayerEligibilityProvider,
  createNullPlayerDirectoryProvider,
  createNullStandingsProvider,
} from './adapters/nullAdapters.js';

/**
 * Wires concrete infrastructure adapters to application use cases. Mirrors
 * competition's/coaching's compositionRoot.js exactly for consistency.
 *
 * `playerEligibilityProvider`/`playerDirectoryProvider`/`standingsProvider`
 * are optional, cross-module dependencies -- app.js supplies the real
 * ones. Left unset (e.g. in a standalone/test call), they default to
 * null-object adapters matching each port's own documented fail-closed/
 * fail-open default.
 */
export function buildTournamentContainer({
  prismaClient = prisma,
  clock = systemClock,
  clubId = DEFAULT_CLUB_ID,
  playerEligibilityProvider = createNullPlayerEligibilityProvider(),
  playerDirectoryProvider = createNullPlayerDirectoryProvider(),
  standingsProvider = createNullStandingsProvider(),
} = {}) {
  const tournamentRepository = createPrismaTournamentRepository(prismaClient);

  return {
    createTournament: createCreateTournament({ tournamentRepository, clock, clubId }),
    addParticipant: createAddParticipant({ tournamentRepository, playerEligibilityProvider }),
    removeParticipant: createRemoveParticipant({ tournamentRepository }),
    generateDraw: createGenerateDraw({ tournamentRepository, standingsProvider, clock }),
    recordMatchResult: createRecordMatchResult({ tournamentRepository, clock }),
    getTournament: createGetTournament({ tournamentRepository, playerDirectoryProvider }),
    listTournaments: createListTournaments({ tournamentRepository, clubId }),
    cancelTournament: createCancelTournament({ tournamentRepository, clock }),
  };
}
