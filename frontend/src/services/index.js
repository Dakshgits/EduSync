import api from './api';

const data = (p) => p.then((r) => r.data.data);

export const authApi = {
  me: () => data(api.get('/auth/me')),
  login: (b) => data(api.post('/auth/login', b)),
  register: (b) => data(api.post('/auth/register', b)),
  logout: () => data(api.post('/auth/logout')),
  updateProfile: (b) => data(api.patch('/auth/profile', b)),
  changePassword: (b) => data(api.post('/auth/change-password', b)),
};
export const groupApi = {
  mine: () => data(api.get('/groups/me')),
  list: () => data(api.get('/groups')),
  get: (id) => data(api.get(`/groups/${id}`)),
  create: (group_name) => data(api.post('/groups', { group_name })),
  invite: (id, identifier) => data(api.post(`/groups/${id}/invitations`, { identifier })),
  cancelInvite: (id, invId) => data(api.delete(`/groups/${id}/invitations/${invId}`)),
  removeMember: (id, userId) => data(api.delete(`/groups/${id}/members/${userId}`)),
};
export const invitationApi = {
  list: () => data(api.get('/invitations')),
  accept: (id) => data(api.post(`/invitations/${id}/accept`)),
  reject: (id) => data(api.post(`/invitations/${id}/reject`)),
};
export const assignmentApi = {
  list: () => data(api.get('/assignments')),
  get: (id) => data(api.get(`/assignments/${id}`)),
  create: (b) => data(api.post('/assignments', b)),
  update: (id, b) => data(api.put(`/assignments/${id}`, b)),
  remove: (id) => data(api.delete(`/assignments/${id}`)),
};
export const submissionApi = {
  list: (params) => data(api.get('/submissions', { params })),
  get: (id) => data(api.get(`/submissions/${id}`)),
  confirm: (id) => data(api.post(`/submissions/${id}/confirm`)),
};
export const analyticsApi = {
  admin: () => data(api.get('/analytics/admin')),
  assignments: () => data(api.get('/analytics/assignments')),
  groups: () => data(api.get('/analytics/groups')),
  students: () => data(api.get('/analytics/students')),
  student: () => data(api.get('/analytics/student')),
};
