const { withTransaction } = require('../config/db');
const ApiError = require('../utils/ApiError');
const groupModel = require('../models/groupModel');
const submissionModel = require('../models/submissionModel');

async function detail(user, id, db) {
  const s = await submissionModel.getById(id, db);
  if (!s) throw ApiError.notFound('Submission not found');
  if (user.role !== 'ADMIN') {
    const m = await groupModel.getMembership(user.id, db);
    if (!m || m.group_id !== s.group_id) throw ApiError.forbidden('This submission belongs to another group');
  }
  const members = await submissionModel.memberConfirmations(id, s.group_id, db);
  return { ...s, members, my_confirmed: members.some((m) => m.id === user.id && m.confirmed) };
}

async function list(user, filters) {
  if (user.role === 'ADMIN') return submissionModel.listAdmin(filters);
  const m = await groupModel.getMembership(user.id);
  return m ? submissionModel.listForGroup(m.group_id) : [];
}

/** Second step of the two-step flow. The student is always the authenticated user. */
async function confirm(user, id) {
  if (user.role !== 'STUDENT') throw ApiError.forbidden('Only students can confirm a submission');
  return withTransaction(async (c) => {
    const sub = await submissionModel.lockById(id, c); // serialises concurrent confirmations on this submission
    if (!sub) throw ApiError.notFound('Submission not found');
    const m = await groupModel.getMembership(user.id, c);
    if (!m || m.group_id !== sub.group_id) throw ApiError.forbidden('You can only confirm submissions for your own group');
    const row = await submissionModel.insertConfirmation(id, user.id, c);
    if (!row) throw ApiError.conflict('You have already confirmed this submission');
    await submissionModel.refreshStatus({ submissionId: id }, c);
    return detail(user, id, c);
  });
}

module.exports = { detail, list, confirm };
