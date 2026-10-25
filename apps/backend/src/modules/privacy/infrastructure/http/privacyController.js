import { mapPrivacyError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapPrivacyError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildPrivacyContainer>} container */
export function createPrivacyController(container) {
  return {
    exportMyData: asyncHandler(async (req, res) => {
      const result = await container.exportMyData({ userId: req.user.id });
      const day = result.generatedAt.slice(0, 10);
      res.set('Cache-Control', 'no-store');
      res.set('Content-Disposition', `attachment; filename="mis-datos-ctcj-${day}.json"`);
      res.status(200).json(result);
    }),

    submitDataRequest: asyncHandler(async (req, res) => {
      const result = await container.submitDataRequest({
        userId: req.user.id,
        kind: req.body.kind,
        description: req.body.description,
      });
      res.status(201).json(result);
    }),

    listMyDataRequests: asyncHandler(async (req, res) => {
      const requests = await container.listMyDataRequests({ userId: req.user.id });
      res.status(200).json({ requests });
    }),

    listDataRequests: asyncHandler(async (req, res) => {
      const requests = await container.listDataRequests({ openOnly: req.query.open === 'true' });
      res.status(200).json({ requests });
    }),

    answerDataRequest: asyncHandler(async (req, res) => {
      const result = await container.answerDataRequest({
        id: req.params.id,
        staffUserId: req.user.id,
        status: req.body.status,
        answer: req.body.answer,
        eraseAccount: req.body.eraseAccount,
      });
      res.status(200).json(result);
    }),
  };
}
