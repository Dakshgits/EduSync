const { withTransaction } = require('../config/db');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const groupModel = require('../models/groupModel');
const userModel = require('../models/userModel');
const submissionModel = require('../models/submissionModel');

async function createGroup(user, name) {
  return withTransaction(async (c) => {
    if (await groupModel.getMembership(user.id, c)) throw ApiError.conflict('You already belong to a group. Leave it before creating a new one.');
    const group = await groupModel.createGroup(name.trim(), user.id, c);
    await groupModel.addMember(group.id, user.id, 'LEADER', c);
    await submissionModel.syncForGroup(group.id, c); // assignments for "all students" now include this group
    await submissionModel.refreshStatus({ groupId: group.id }, c);
    // a leader has no pending invites elsewhere that still make sense; leave them for the user to reject
    return group;
  });
}

async function assertCanView(user, groupId) {
  if (user.role === 'ADMIN') return;
  const m = await groupModel.getMembership(user.id);
  if (!m || m.group_id !== groupId) throw ApiError.forbidden('You can only view your own group');
}

async function assertLeader(user, groupId, db) {
  const m = await groupModel.getMembership(user.id, db);
  if (!m || m.group_id !== groupId || m.member_role !== 'LEADER') throw ApiError.forbidden('Only the group leader can do this');
}

async function getGroupDetail(user, groupId) {
  await assertCanView(user, groupId);
  const group = await groupModel.getGroup(groupId);
  if (!group) throw ApiError.notFound('Group not found');
  const members = await groupModel.listMembers(groupId);
  const me = members.find((m) => m.id === user.id);
  const detail = { ...group, members, max_size: env.groupMaxSize, my_role: me ? me.member_role : null };
  const isLeader = me && me.member_role === 'LEADER';
  if (isLeader || user.role === 'ADMIN') detail.invitations = await groupModel.listGroupInvitations(groupId);
  if (user.role === 'ADMIN') detail.submissions = await submissionModel.listForGroup(groupId);
  return detail;
}

async function getMyGroup(user) {
  const m = await groupModel.getMembership(user.id);
  if (!m) return null;
  return getGroupDetail(user, m.group_id);
}

async function invite(user, groupId, identifier) {
  return withTransaction(async (c) => {
    await groupModel.getGroup(groupId, c, true); // lock group row to serialise capacity checks
    await assertLeader(user, groupId, c);
    const target = await userModel.findStudentByIdentifier(identifier, c);
    if (!target) throw ApiError.notFound('No student found with that email or student ID');
    if (target.id === user.id) throw ApiError.badRequest('You are already the leader of this group');
    if (await groupModel.getMembership(target.id, c)) throw ApiError.conflict(`${target.full_name} already belongs to a group`);
    if (await groupModel.hasPendingInvite(groupId, target.id, c)) throw ApiError.conflict(`${target.full_name} already has a pending invitation`);
    const used = (await groupModel.countMembers(groupId, c)) + (await groupModel.countPendingInvites(groupId, c));
    if (used >= env.groupMaxSize) throw ApiError.conflict(`Groups can have at most ${env.groupMaxSize} members (including pending invitations)`);
    const inv = await groupModel.createInvitation(groupId, target.id, user.id, c);
    return { ...inv, full_name: target.full_name, email: target.email, student_id: target.student_id };
  });
}

async function cancelInvitation(user, groupId, invitationId) {
  return withTransaction(async (c) => {
    await assertLeader(user, groupId, c);
    const inv = await groupModel.getInvitation(invitationId, c, true);
    if (!inv || inv.group_id !== groupId) throw ApiError.notFound('Invitation not found');
    if (inv.status !== 'PENDING') throw ApiError.conflict('Only pending invitations can be cancelled');
    await groupModel.deleteInvitation(invitationId, c);
  });
}

/** Leader removes a member, or a member leaves (userId === own id). */
async function removeMember(user, groupId, userId) {
  return withTransaction(async (c) => {
    const group = await groupModel.getGroup(groupId, c, true);
    if (!group) throw ApiError.notFound('Group not found');
    const me = await groupModel.getMembership(user.id, c);
    if (!me || me.group_id !== groupId) throw ApiError.forbidden('You are not a member of this group');
    const selfRemoval = userId === user.id;
    if (!selfRemoval && me.member_role !== 'LEADER') throw ApiError.forbidden('Only the group leader can remove other members');
    const target = await groupModel.getMembership(userId, c);
    if (!target || target.group_id !== groupId) throw ApiError.notFound('That student is not a member of this group');

    if (selfRemoval && target.member_role === 'LEADER') {
      const next = await groupModel.nextLeaderCandidate(groupId, userId, c);
      if (!next) {
        if (await groupModel.hasConfirmations(groupId, c)) throw ApiError.conflict('This group has submission records and cannot be dissolved. Ask your professor.');
        await groupModel.deleteGroup(groupId, c);
        return { dissolved: true };
      }
      await groupModel.removeMember(groupId, userId, c);
      await groupModel.setLeader(groupId, next, c);
    } else {
      await groupModel.removeMember(groupId, userId, c);
    }
    await submissionModel.refreshStatus({ groupId }, c); // totals changed, so statuses may change
    return { dissolved: false };
  });
}

async function listForUser(user) {
  if (user.role === 'ADMIN') return groupModel.listGroupsOverview();
  const mine = await getMyGroup(user);
  return mine ? [mine] : [];
}

module.exports = { createGroup, getGroupDetail, getMyGroup, invite, cancelInvitation, removeMember, listForUser };
