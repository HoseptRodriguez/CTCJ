import { mapInquiriesError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapInquiriesError(err)));
  };
}

/** @param {ReturnType<import('../compositionRoot.js').buildInquiriesContainer>} container */
export function createInquiriesController(container) {
  return {
    formToken: asyncHandler(async (_req, res) => {
      res.set('Cache-Control', 'no-store');
      res.status(200).json(container.issueFormToken());
    }),
    submit: asyncHandler(async (req, res) => {
      res.status(201).json(await container.submitInfoRequest(req.body));
    }),
    list: asyncHandler(async (req, res) => {
      res.status(200).json({ requests: await container.listInfoRequests(req.query) });
    }),
    countNew: asyncHandler(async (_req, res) => {
      res.status(200).json(await container.countNewInfoRequests());
    }),
    setStatus: asyncHandler(async (req, res) => {
      res.status(200).json(
        await container.setInfoRequestStatus({
          id: req.params.id,
          status: req.body.status,
          staffUserId: req.user.id,
        }),
      );
    }),
    addNote: asyncHandler(async (req, res) => {
      res.status(201).json(
        await container.addInfoRequestNote({
          id: req.params.id,
          text: req.body.text,
          staffUserId: req.user.id,
        }),
      );
    }),
  };
}
