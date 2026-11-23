const { asyncHandler, ok } = require('../utils/helpers');
const svc = require('../services/analyticsService');

module.exports = {
  admin: asyncHandler(async (_req, res) => ok(res, await svc.admin())),
  assignments: asyncHandler(async (_req, res) => ok(res, await svc.assignments())),
  groups: asyncHandler(async (_req, res) => ok(res, await svc.groups())),
  students: asyncHandler(async (_req, res) => ok(res, await svc.students())),
  student: asyncHandler(async (req, res) => ok(res, await svc.student(req.user.id))),
};
