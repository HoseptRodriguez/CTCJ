function toRow(r) {
  return {
    docType: r.docType,
    version: r.version,
    publishedOn: r.publishedOn,
    title: r.title,
    content: r.content,
    contentSha256: r.contentSha256,
  };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/LegalDocumentRepository.js').LegalDocumentRepository}
 */
export function createPrismaLegalDocumentRepository(prisma) {
  return {
    async find(docType, version) {
      const r = await prisma.legalDocument.findUnique({
        where: { docType_version: { docType, version } },
      });
      return r ? toRow(r) : null;
    },
    async insert(row) {
      return toRow(await prisma.legalDocument.create({ data: row }));
    },
  };
}
