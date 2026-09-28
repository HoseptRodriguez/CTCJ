import { prisma } from '../../../shared/prismaClient.js';
import { DEFAULT_CLUB_ID } from '../../../config/club.js';
import { systemClock } from '../application/ports/Clock.js';
import { createDataRequestUseCases } from '../application/useCases/dataRequests.js';
import { createExportMyData } from '../application/useCases/exportMyData.js';

import { createPrismaDataRequestRepository } from './persistence/prismaDataRequestRepository.js';
import { createPrismaPersonalDataExporter } from './persistence/prismaPersonalDataExporter.js';
import { createNullAccountEraser, createNullPersonDirectory } from './adapters/nullAdapters.js';

/**
 * The data subject's rights (Ley 1581 de 2012): download their data, file
 * consultas y reclamos with a radicado, and the club's inbox to answer
 * them on time. `personDirectory`/`accountEraser` come from app.js.
 */
export function buildPrivacyContainer({
  prismaClient = prisma,
  clock = systemClock,
  clubId = DEFAULT_CLUB_ID,
  personDirectory = createNullPersonDirectory(),
  accountEraser = createNullAccountEraser(),
} = {}) {
  const dataRequestRepository = createPrismaDataRequestRepository(prismaClient);
  return {
    ...createDataRequestUseCases({
      dataRequestRepository,
      personDirectory,
      accountEraser,
      clock,
      clubId,
    }),
    exportMyData: createExportMyData({
      personalDataExporter: createPrismaPersonalDataExporter(prismaClient),
      clock,
    }),
  };
}
