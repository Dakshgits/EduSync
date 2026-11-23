const { asyncHandler, ok } = require('../utils/helpers');
const svc = require('../services/assignmentService');

module.exports = {
  list: asyncHandler(async (req, res) => ok(res, await svc.list(req.user))),
  get: asyncHandler(async (req, res) => ok(res, await svc.getOne(req.user, req.params.id))),
  create: asyncHandler(async (req, res) => { const a = await svc.create(req.user, req.body); ok(res, await svc.getOne(req.user, a.id), 'Assignment created', 201); }),
  update: asyncHandler(async (req, res) => { await svc.update(req.user, req.params.id, req.body); ok(res, await svc.getOne(req.user, req.params.id), 'Assignment updated'); }),
  remove: asyncHandler(async (req, res) => ok(res, await svc.remove(req.user, req.params.id), 'Assignment deleted')),
};
