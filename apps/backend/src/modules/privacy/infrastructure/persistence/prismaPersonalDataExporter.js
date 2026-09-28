/** Money columns are BigInt (pesos): plain numbers in the file. */
function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)));
}

/**
 * Reads, only for the person asking, what the club keeps about them across
 * the platform's tables. Read-only, explicit selects: secrets (password and
 * MFA hashes, token hashes) and other people's data never leave. Health
 * data is left out on purpose (the privacy policy promises it never goes
 * into exports); the person sees it in Mi CTCJ or asks for a copy.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {import('../../application/ports/PersonalDataExporter.js').PersonalDataExporter}
 */
export function createPrismaPersonalDataExporter(prisma) {
  const visible = 'PLAYER_VISIBLE'; // coach notes shared with the player

  return {
    async exportFor(userId) {
      const [
        profile,
        roles,
        consents,
        guardianships,
        reservations,
        memberships,
        goals,
        coachNotes,
        ratings,
        posts,
        comments,
        notifications,
        clinicalAccess,
        dataRequests,
      ] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            email: true,
            firstName: true,
            lastName: true,
            documentType: true,
            documentNumber: true,
            phone: true,
            birthDate: true,
            bio: true,
            avatarUrl: true,
            dominantHand: true,
            backhand: true,
            status: true,
            emailVerifiedAt: true,
            lastLoginAt: true,
            membershipStatus: true,
            createdAt: true,
          },
        }),
        prisma.userRole.findMany({
          where: { userId },
          select: { role: { select: { code: true } }, grantedAt: true, revokedAt: true },
        }),
        prisma.consent.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          select: {
            consentType: true,
            documentVersion: true,
            action: true,
            details: true,
            givenBy: true,
            ipAddress: true,
            createdAt: true,
          },
        }),
        prisma.guardianship.findMany({
          where: { OR: [{ guardianUserId: userId }, { minorUserId: userId }] },
          select: {
            guardianUserId: true,
            minorUserId: true,
            status: true,
            canBook: true,
            canPay: true,
            requestedAt: true,
            decidedAt: true,
          },
        }),
        prisma.reservation.findMany({
          where: { holderUserId: userId },
          orderBy: { periodStart: 'desc' },
          select: {
            periodStart: true,
            periodEnd: true,
            status: true,
            reservationType: true,
            priceCop: true,
            court: { select: { name: true } },
            createdAt: true,
          },
        }),
        prisma.playerMembership.findMany({
          where: { playerId: userId },
          select: {
            startDate: true,
            endDate: true,
            frequency: true,
            status: true,
            plan: { select: { name: true } },
            invoices: {
              select: {
                status: true,
                amountCop: true,
                periodStart: true,
                periodEnd: true,
                dueDate: true,
                issuedAt: true,
                paidAmountCop: true,
                paidMethod: true,
                paidAt: true,
              },
            },
          },
        }),
        prisma.goal.findMany({
          where: { playerId: userId },
          select: {
            title: true,
            metricType: true,
            targetValue: true,
            status: true,
            createdAt: true,
            achievedAt: true,
          },
        }),
        prisma.coachNote.findMany({
          where: { playerId: userId, visibility: visible },
          select: { noteType: true, area: true, content: true, createdAt: true },
        }),
        prisma.performanceRating.findMany({
          where: { playerId: userId },
          select: { area: true, rating: true, recordedAt: true },
        }),
        prisma.communityPost.findMany({
          where: { authorId: userId },
          select: {
            content: true,
            createdAt: true,
            hiddenAt: true,
            media: { select: { url: true } },
          },
        }),
        prisma.communityComment.findMany({
          where: { authorId: userId },
          select: { content: true, createdAt: true },
        }),
        prisma.notification.findMany({
          where: { recipientId: userId },
          orderBy: { createdAt: 'desc' },
          take: 200,
          select: { type: true, title: true, body: true, readAt: true, createdAt: true },
        }),
        prisma.clinicalAccessConsent.findMany({
          where: { playerId: userId },
          select: { scope: true, grantedAt: true, revokedAt: true },
        }),
        prisma.dataSubjectRequest.findMany({
          where: { userId },
          select: {
            radicado: true,
            kind: true,
            description: true,
            status: true,
            receivedAt: true,
            dueOn: true,
            answer: true,
            answeredAt: true,
          },
        }),
      ]);

      return toPlainJson({
        perfil: profile,
        roles: roles.map((r) => ({
          rol: r.role.code,
          desde: r.grantedAt,
          hasta: r.revokedAt,
        })),
        autorizaciones: consents,
        vinculosDeAcudiente: guardianships,
        reservas: reservations,
        planesYFacturas: memberships,
        metas: goals,
        notasDelEntrenador: coachNotes,
        calificacionesDeRendimiento: ratings,
        comunidad: { publicaciones: posts, comentarios: comments },
        notificaciones: notifications,
        salud: {
          nota: 'Por ser datos sensibles, tus datos de salud no se incluyen en este archivo (Política de datos, sección 4). Los ves en Mi CTCJ, y puedes pedir una copia con una consulta en «Mis datos y privacidad».',
          accesoDeLaAdministracionANotasDeFisioterapia: clinicalAccess,
        },
        solicitudesSobreMisDatos: dataRequests,
      });
    },
  };
}
