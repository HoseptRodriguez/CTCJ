import { mapIdentityError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapIdentityError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildIdentityContainer>} container */
export function createMeController(container) {
  const getMyProfile = asyncHandler(async (req, res) => {
    const result = await container.getMyProfile({ userId: req.user.id });
    res.status(200).json(result);
  });

  const updateMyProfile = asyncHandler(async (req, res) => {
    const result = await container.updateMyProfile({
      userId: req.user.id,
      phone: req.body.phone,
      birthDate: req.body.birthDate,
      bio: req.body.bio,
      dominantHand: req.body.dominantHand,
      backhand: req.body.backhand,
    });
    res.status(200).json(result);
  });

  const uploadMyAvatar = asyncHandler(async (req, res) => {
    const result = await container.uploadMyAvatar({
      userId: req.user.id,
      buffer: req.file?.buffer,
      mimeType: req.file?.mimetype,
    });
    res.status(200).json(result);
  });

  const getMyAchievements = asyncHandler(async (req, res) => {
    const result = await container.getMyAchievements({ userId: req.user.id });
    res.status(200).json(result);
  });

  const getMembershipStatus = asyncHandler(async (req, res) => {
    const result = await container.getMembershipStatus({ userId: req.user.id });
    res.status(200).json(result);
  });

  const requestAffiliation = asyncHandler(async (req, res) => {
    const result = await container.requestAffiliation({
      userId: req.user.id,
      notes: req.body.notes,
    });
    res.status(201).json(result);
  });

  const getMyAffiliationRequests = asyncHandler(async (req, res) => {
    const result = await container.getMyAffiliationRequests({ userId: req.user.id });
    res.status(200).json({ requests: result });
  });

  const requestGuardianship = asyncHandler(async (req, res) => {
    const result = await container.requestGuardianship({
      guardianUserId: req.user.id,
      minorEmail: req.body.minorEmail,
      canPay: req.body.canPay,
      canBook: req.body.canBook,
    });
    res.status(201).json(result);
  });

  const listMyGuardianships = asyncHandler(async (req, res) => {
    const result = await container.listMyGuardianships({ guardianUserId: req.user.id });
    res.status(200).json({ guardianships: result });
  });

  // Proof of the authorization: who, when, from where (Ley 1581 de 2012).
  const origin = (req) => ({
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent')?.slice(0, 500) ?? null,
  });

  const authorizeMinor = asyncHandler(async (req, res) => {
    const result = await container.authorizeMinor({
      guardianUserId: req.user.id,
      guardianshipId: req.params.id,
      ...origin(req),
    });
    res.status(200).json(result);
  });

  const withdrawMinorAuthorization = asyncHandler(async (req, res) => {
    const result = await container.withdrawMinorAuthorization({
      guardianUserId: req.user.id,
      guardianshipId: req.params.id,
      ...origin(req),
    });
    res.status(200).json(result);
  });

  const getAccountRestrictions = asyncHandler(async (req, res) => {
    res.status(200).json(await container.getAccountRestrictions({ userId: req.user.id }));
  });

  return {
    authorizeMinor,
    withdrawMinorAuthorization,
    getAccountRestrictions,
    getMyProfile,
    updateMyProfile,
    uploadMyAvatar,
    getMyAchievements,
    getMembershipStatus,
    requestAffiliation,
    getMyAffiliationRequests,
    requestGuardianship,
    listMyGuardianships,
  };
}
