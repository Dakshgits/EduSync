const { withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const assignmentModel = require('../models/assignmentModel');
const submissionModel = require('../models/submissionModel');

async function resolveTargets(body, c) {
  if (body.target_type !== 'SELECTED_GROUPS') return [];
  const ids = [...new Set((body.group_ids || []).map(Number))];
  if (!ids.length) throw new ApiError(422, 'Select at least one group', 'VALIDATION_ERROR', { group_ids: 'Select at least one group' });
  const found = await assignmentModel.existingGroupIds(ids, c);
  if (found.length !== ids.length) throw new ApiError(422, 'One or more selected groups do not exist', 'VALIDATION_ERROR', { group_ids: 'One or more selected groups do not exist' });
  return ids;
}

async function create(admin, body) {
  return withTransaction(async (c) => {
    const groupIds = await resolveTargets(body, c);
    const a = await assignmentModel.create(body, admin.id, c);
    if (groupIds.length) await assignmentModel.setTargets(a.id, groupIds, c);
    await submissionModel.syncForAssignment(a.id, c);
    return a;
  });
}

async function assertOwner(admin, a) {
  if (!a) throw ApiError.notFound('Assignment not found');
  if (a.created_by !== admin.id) throw ApiError.forbidden('Only the professor who created this assignment can change it');
}

async function update(admin, id, body) {
  return withTransaction(async (c) => {
    const existing = await assignmentModel.findRaw(id, c, true);
    await assertOwner(admin, existing);
    const groupIds = await resolveTargets(body, c);

    if (body.target_type === 'SELECTED_GROUPS') {
      const blocked = await assignmentModel.groupsWithConfirmationsOutside(id, groupIds, c);
      if (blocked.length) throw ApiError.conflict(`Cannot remove groups that already have confirmations: ${blocked.join(', ')}`);
      await assignmentModel.deleteSubmissionsOutside(id, groupIds, c);
    }
    const updated = await assignmentModel.update(id, body, c);
    await assignmentModel.setTargets(id, groupIds, c); // empty list clears targets when switching to ALL
    await submissionModel.syncForAssignment(id, c);
    await submissionModel.refreshStatus({ assignmentId: id }, c);
    return updated;
  });
}

async function remove(admin, id) {
  return withTransaction(async (c) => {
    const existing = await assignmentModel.findRaw(id, c, true);
    await assertOwner(admin, existing);
    const related = await assignmentModel.countRelated(id, c);
    await assignmentModel.remove(id, c); // cascades to targets, submissions, confirmations
    return related;
  });
}

async function list(user) {
  return user.role === 'ADMIN' ? assignmentModel.listAdmin() : assignmentModel.listForStudent(user.id);
}

async function getOne(user, id) {
  if (user.role === 'ADMIN') {
    const [a] = await assignmentModel.listAdmin(id);
    if (!a) throw ApiError.notFound('Assignment not found');
    return { ...a, group_ids: await assignmentModel.targetGroupIds(id), submissions: await submissionModel.listAdmin({ assignmentId: id }) };
  }
  const [a] = await assignmentModel.listForStudent(user.id, id);
  if (!a) throw ApiError.notFound('Assignment not found'); // hidden if not assigned to this student
  return a;
}

module.exports = { create, update, remove, list, getOne };
