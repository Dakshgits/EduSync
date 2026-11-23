const { body, param, query } = require('express-validator');
const env = require('../config/env');

const id = (name = 'id') => param(name).isInt({ min: 1 }).withMessage('Invalid id').toInt();

const passwordRules = (field = 'password') =>
  body(field).isString().withMessage('Password is required')
    .isLength({ min: 8, max: 72 }).withMessage('Password must be 8–72 characters')
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter')
    .matches(/\d/).withMessage('Password must contain a number');

const register = [
  body('full_name').isString().trim().isLength({ min: 2, max: 120 }).withMessage('Full name must be 2–120 characters'),
  body('email').isString().trim().isEmail().withMessage('Enter a valid email address').isLength({ max: 255 }).normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
  body('student_id').isString().trim().matches(/^[A-Za-z0-9_-]{3,30}$/).withMessage('Student ID must be 3–30 letters, numbers, - or _'),
  passwordRules('password'),
  body('confirm_password').custom((v, { req }) => v === req.body.password).withMessage('Passwords do not match'),
];

const login = [
  body('email').isString().trim().isEmail().withMessage('Enter a valid email address').normalizeEmail({ gmail_remove_dots: false, gmail_remove_subaddress: false }),
  body('password').isString().notEmpty().withMessage('Password is required'),
];

const profile = [body('full_name').isString().trim().isLength({ min: 2, max: 120 }).withMessage('Full name must be 2–120 characters')];

const changePassword = [
  body('current_password').isString().notEmpty().withMessage('Current password is required'),
  passwordRules('new_password'),
  body('confirm_password').custom((v, { req }) => v === req.body.new_password).withMessage('Passwords do not match'),
];

const createGroup = [body('group_name').isString().trim().isLength({ min: 2, max: 80 }).withMessage('Group name must be 2–80 characters')];
const invite = [id(), body('identifier').isString().trim().isLength({ min: 3, max: 255 }).withMessage('Enter a student email or student ID')];

const oneDriveLink = body('onedrive_link').isString().trim()
  .isURL({ protocols: ['https'], require_protocol: true, require_tld: true }).withMessage('Enter a valid https:// link')
  .custom((v) => {
    const host = new URL(v).hostname.toLowerCase();
    if (!env.allowedLinkHosts.some((h) => host === h || host.endsWith(`.${h}`))) throw new Error('Link must be a OneDrive / SharePoint address');
    return true;
  });

const assignment = [
  body('title').isString().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3–200 characters'),
  body('description').optional({ nullable: true }).isString().isLength({ max: 5000 }).withMessage('Description is too long (max 5000)'),
  body('due_date').isISO8601().withMessage('Enter a valid due date').toDate(),
  oneDriveLink,
  body('target_type').isIn(['ALL', 'SELECTED_GROUPS']).withMessage('Choose who receives this assignment'),
  body('group_ids').optional({ nullable: true }).isArray({ max: 500 }).withMessage('group_ids must be a list'),
  body('group_ids.*').optional().isInt({ min: 1 }).withMessage('Invalid group id').toInt(),
];

const submissionFilters = [
  query('assignment_id').optional().isInt({ min: 1 }).toInt(),
  query('group_id').optional().isInt({ min: 1 }).toInt(),
  query('status').optional().isIn(['PENDING', 'PARTIAL', 'SUBMITTED']),
];

module.exports = { id, register, login, profile, changePassword, createGroup, invite, assignment, submissionFilters };
