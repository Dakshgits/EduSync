const { asyncHandler, ok } = require('../utils/helpers');
const groupService = require('../services/groupService');

module.exports = {
  create: asyncHandler(async (req, res) => {
    const g = await groupService.createGroup(req.user, req.body.group_name);
    ok(res, await groupService.getGroupDetail(req.user, g.id), 'Group created', 201);
  }),
  list: asyncHandler(async (req, res) => ok(res, await groupService.listForUser(req.user))),
  mine: asyncHandler(async (req, res) => ok(res, await groupService.getMyGroup(req.user))),
  get: asyncHandler(async (req, res) => ok(res, await groupService.getGroupDetail(req.user, req.params.id))),
  members: asyncHandler(async (req, res) => ok(res, (await groupService.getGroupDetail(req.user, req.params.id)).members)),
  invite: asyncHandler(async (req, res) => ok(res, await groupService.invite(req.user, req.params.id, req.body.identifier), 'Invitation sent', 201)),
  cancelInvite: asyncHandler(async (req, res) => { await groupService.cancelInvitation(req.user, req.params.id, req.params.invId); ok(res, null, 'Invitation cancelled'); }),
  removeMember: asyncHandler(async (req, res) => {
    const r = await groupService.removeMember(req.user, req.params.id, req.params.userId);
    ok(res, r, r.dissolved ? 'Group dissolved' : 'Member removed');
  }),
};
