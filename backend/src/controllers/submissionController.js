const { asyncHandler, ok } = require('../utils/helpers');
const svc = require('../services/submissionService');

module.exports = {
  list: asyncHandler(async (req, res) => ok(res, await svc.list(req.user, { assignmentId: req.query.assignment_id, groupId: req.query.group_id, status: req.query.status }))),
  get: asyncHandler(async (req, res) => ok(res, await svc.detail(req.user, req.params.id))),
  progress: asyncHandler(async (req, res) => {
    const d = await svc.detail(req.user, req.params.id);
    ok(res, { submission_id: d.id, total_members: d.total_members, confirmed_members: d.confirmed_members, percent: d.percent, status: d.status, members: d.members });
  }),
  confirm: asyncHandler(async (req, res) => ok(res, await svc.confirm(req.user, req.params.id), 'Submission confirmed', 201)),
};
