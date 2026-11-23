const { withTransaction } = require('../config/db');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const groupModel = require('../models/groupModel');
const submissionModel = require('../models/submissionModel');

async function getOwnedPending(user, id, c) {
  const inv = await groupModel.getInvitation(id, c, true);
  if (!inv || inv.invited_user_id !== user.id) throw ApiError.notFound('Invitation not found');
  if (inv.status !== 'PENDING') throw ApiError.conflict(`This invitation was already ${inv.status.toLowerCase()}`);
  return inv;
}

async function accept(user, id) {
  return withTransaction(async (c) => {
    const inv = await getOwnedPending(user, id, c);
    if (await groupModel.getMembership(user.id, c)) throw ApiError.conflict('You already belong to a group. Leave it first to accept another invitation.');
    const group = await groupModel.getGroup(inv.group_id, c, true);
    if (!group) throw ApiError.notFound('That group no longer exists');
    if ((await groupModel.countMembers(group.id, c)) >= env.groupMaxSize) throw ApiError.conflict('That group is already full');
    await groupModel.addMember(group.id, user.id, 'MEMBER', c);
    const updated = await groupModel.setInvitationStatus(id, 'ACCEPTED', c);
    await submissionModel.refreshStatus({ groupId: group.id }, c); // a new member means progress is recalculated
    return updated;
  });
}

async function reject(user, id) {
  return withTransaction(async (c) => {
    await getOwnedPending(user, id, c);
    return groupModel.setInvitationStatus(id, 'REJECTED', c);
  });
}

module.exports = { accept, reject, list: (user) => groupModel.listUserInvitations(user.id) };
