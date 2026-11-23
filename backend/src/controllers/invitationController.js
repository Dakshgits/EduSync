const { asyncHandler, ok } = require('../utils/helpers');
const svc = require('../services/invitationService');

module.exports = {
  list: asyncHandler(async (req, res) => ok(res, await svc.list(req.user))),
  accept: asyncHandler(async (req, res) => ok(res, await svc.accept(req.user, req.params.id), 'Invitation accepted')),
  reject: asyncHandler(async (req, res) => ok(res, await svc.reject(req.user, req.params.id), 'Invitation declined')),
};
