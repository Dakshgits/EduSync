const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const v = require('../validators');
const auth = require('../controllers/authController');
const groups = require('../controllers/groupController');
const invitations = require('../controllers/invitationController');
const assignments = require('../controllers/assignmentController');
const submissions = require('../controllers/submissionController');
const analytics = require('../controllers/analyticsController');

const student = authorize('STUDENT');
const admin = authorize('ADMIN');
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, skip: () => env.isTest,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again in a few minutes.' } } });

router.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));

// Authentication
router.post('/auth/register', authLimiter, v.register, validate, auth.register);
router.post('/auth/login', authLimiter, v.login, validate, auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', authenticate, auth.me);
router.patch('/auth/profile', authenticate, v.profile, validate, auth.updateProfile);
router.post('/auth/change-password', authenticate, v.changePassword, validate, auth.changePassword);

// Groups
router.post('/groups', authenticate, student, v.createGroup, validate, groups.create);
router.get('/groups', authenticate, groups.list);
router.get('/groups/me', authenticate, student, groups.mine);
router.get('/groups/:id', authenticate, v.id(), validate, groups.get);
router.get('/groups/:id/members', authenticate, v.id(), validate, groups.members);
router.post('/groups/:id/invitations', authenticate, student, v.invite, validate, groups.invite);
router.delete('/groups/:id/invitations/:invId', authenticate, student, v.id(), v.id('invId'), validate, groups.cancelInvite);
router.delete('/groups/:id/members/:userId', authenticate, student, v.id(), v.id('userId'), validate, groups.removeMember);

// Invitations (received by the signed-in student)
router.get('/invitations', authenticate, student, invitations.list);
router.post('/invitations/:id/accept', authenticate, student, v.id(), validate, invitations.accept);
router.post('/invitations/:id/reject', authenticate, student, v.id(), validate, invitations.reject);

// Assignments
router.get('/assignments', authenticate, assignments.list);
router.get('/assignments/:id', authenticate, v.id(), validate, assignments.get);
router.post('/assignments', authenticate, admin, v.assignment, validate, assignments.create);
router.put('/assignments/:id', authenticate, admin, v.id(), v.assignment, validate, assignments.update);
router.delete('/assignments/:id', authenticate, admin, v.id(), validate, assignments.remove);

// Submissions
router.get('/submissions', authenticate, v.submissionFilters, validate, submissions.list);
router.get('/submissions/:id', authenticate, v.id(), validate, submissions.get);
router.get('/submissions/:id/progress', authenticate, v.id(), validate, submissions.progress);
router.post('/submissions/:id/confirm', authenticate, student, v.id(), validate, submissions.confirm);

// Analytics
router.get('/analytics/admin', authenticate, admin, analytics.admin);
router.get('/analytics/assignments', authenticate, admin, analytics.assignments);
router.get('/analytics/groups', authenticate, admin, analytics.groups);
router.get('/analytics/students', authenticate, admin, analytics.students);
router.get('/analytics/student', authenticate, student, analytics.student);

module.exports = router;
