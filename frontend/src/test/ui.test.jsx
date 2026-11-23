/**
 * UI integration tests: the real React app rendered in jsdom, talking to a REAL running backend + PostgreSQL
 * (seeded demo data). Start the backend first:  cd backend && npm run seed && npm start
 */
import { describe, expect, test, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError } from 'axios';
import api from '../services/api';
import App from '../App';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';

const BACKEND = process.env.TEST_BACKEND || 'http://localhost:5000';
let cookie = '';

// Axios adapter that forwards every request to the live backend and keeps the httpOnly cookie in a jar
api.defaults.adapter = async (config) => {
  const url = new URL(`${BACKEND}${config.baseURL}${config.url}`);
  Object.entries(config.params || {}).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { method: config.method.toUpperCase(), headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: config.data });
  const set = res.headers.getSetCookie();
  if (set.length) { const c = set.map((s) => s.split(';')[0]).join('; '); cookie = c.endsWith('=') || /=;?$/.test(c) ? '' : c; }
  const text = await res.text();
  const response = { data: text ? JSON.parse(text) : null, status: res.status, statusText: res.statusText, headers: {}, config, request: {} };
  if (res.status >= 200 && res.status < 300) return response;
  throw new AxiosError(`HTTP ${res.status}`, 'ERR_BAD_REQUEST', config, {}, response);
};

const mount = (path) => render(
  <MemoryRouter initialEntries={[path]}><ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider></MemoryRouter>
);
async function signIn(email, password) {
  const user = userEvent.setup();
  mount('/login');
  await user.type(await screen.findByLabelText('Email'), email);
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  return user;
}
beforeEach(() => { cookie = ''; });

describe('public pages', () => {
  test('login validation and wrong password message', async () => {
    const user = userEvent.setup();
    mount('/login');
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Email'), 'aarav.sharma@student.edusync.demo');
    await user.type(screen.getByLabelText('Password'), 'WrongPass1');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument();
  });
  test('register form shows client-side validation', async () => {
    const user = userEvent.setup();
    mount('/register');
    await user.click(await screen.findByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Enter your full name')).toBeInTheDocument();
    expect(screen.getByText('Use 3–30 letters, numbers, - or _')).toBeInTheDocument();
  });
  test('protected route redirects to login; unknown route shows 404', async () => {
    mount('/assignments');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
  test('404 page', async () => {
    mount('/nope');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});

describe('student journey', () => {
  test('dashboard, group, assignments, two-step confirmation', async () => {
    // Ananya Iyer: member of Alpha Squad; has NOT yet confirmed "REST API Mini Project" (3 of 4 have)
    const user = await signIn('ananya.iyer@student.edusync.demo', 'Student@12345');
    expect(await screen.findByRole('heading', { name: 'Welcome back, Ananya' })).toBeInTheDocument();
    expect((await screen.findAllByText('Alpha Squad')).length).toBeGreaterThan(0);

    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByText('My group'));
    expect(await screen.findByRole('heading', { name: 'Alpha Squad' })).toBeInTheDocument();
    expect(screen.getByText('Rohan Mehta')).toBeInTheDocument();
    expect(screen.getByText(/Only the group leader can invite/)).toBeInTheDocument();

    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByText('Assignments'));
    expect(await screen.findByText('REST API Mini Project')).toBeInTheDocument();
    expect(screen.queryByText('UI/UX Wireframe Review')).not.toBeInTheDocument(); // targeted at other groups
    await user.type(screen.getByLabelText('Search assignments'), 'rest api');
    expect(screen.queryByText('Database Design Case Study')).not.toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: 'REST API Mini Project' }));
    expect(await screen.findByText('3/4')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Open OneDrive link/ });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');

    await user.click(screen.getByRole('button', { name: 'Yes, I have submitted' }));
    expect(await screen.findByText('Have you successfully uploaded your assignment to the provided OneDrive link?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText(/Have you successfully uploaded/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Yes, I have submitted' }));
    await user.click(await screen.findByRole('button', { name: 'Confirm Submission' }));
    expect(await screen.findByText('You confirmed your submission.')).toBeInTheDocument();
    expect(await screen.findByText('4/4')).toBeInTheDocument();
    expect(screen.getAllByText('Fully confirmed').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Yes, I have submitted' })).not.toBeInTheDocument();
  });

  test('student with no group sees an empty state and can open invitations', async () => {
    const user = await signIn('neha.joshi@student.edusync.demo', 'Student@12345');
    expect(await screen.findByRole('heading', { name: 'Welcome back, Neha' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByText('Invitations'));
    expect(await screen.findByText(/Delta Team/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept/ })).toBeInTheDocument();
    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByText('Assignments'));
    expect((await screen.findAllByText('Join a group to submit')).length).toBeGreaterThan(0); // no group => cannot confirm
  });

  test('students cannot open admin pages', async () => {
    await signIn('aarav.sharma@student.edusync.demo', 'Student@12345');
    await screen.findByRole('heading', { name: 'Welcome back, Aarav' });
    document.body.innerHTML = '';
    mount('/admin/analytics');
    expect(await screen.findByText('You don’t have access to this page')).toBeInTheDocument();
  });
});

describe('professor journey', () => {
  test('dashboard shows database-driven totals', async () => {
    await signIn('admin@edusync.demo', 'Admin@12345');
    expect(await screen.findByText('Total students')).toBeInTheDocument();
    expect(await screen.findByText('Submission completion')).toBeInTheDocument();
    expect(screen.getByText('Group performance')).toBeInTheDocument();
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(screen.getByText('Upcoming deadlines')).toBeInTheDocument();
  });

  test('every admin page renders real data', async () => {
    const user = await signIn('admin@edusync.demo', 'Admin@12345');
    await screen.findByText('Total students');
    const nav = () => within(screen.getByRole('navigation', { name: 'Main' }));

    await user.click(nav().getByText('Assignments'));
    expect(await screen.findByText('Database Design Case Study')).toBeInTheDocument();
    expect(screen.getByText('Algorithms Problem Set')).toBeInTheDocument();

    await user.click(nav().getByText('Submissions'));
    expect(await screen.findAllByRole('button', { name: /Inspect/ })).not.toHaveLength(0);
    await user.click((await screen.findAllByRole('button', { name: /Inspect/ }))[0]);
    expect(await screen.findByText('Confirmation records')).toBeInTheDocument();
    expect(await screen.findByLabelText('Member confirmations')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(nav().getByText('Groups'));
    expect(await screen.findByText('Beta Builders')).toBeInTheDocument();
    await user.click(screen.getByText('Beta Builders'));
    expect(await screen.findByText('Kabir Singh')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await user.click(nav().getByText('Students'));
    expect(await screen.findByText('Neha Joshi')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Search students'), 'priya');
    expect(screen.queryByText('Neha Joshi')).not.toBeInTheDocument();

    await user.click(nav().getByText('Analytics'));
    expect(await screen.findByText('Assignment-wise submissions')).toBeInTheDocument();
    expect(screen.getByText('Assignment breakdown')).toBeInTheDocument();
  });

  test('create an assignment for selected groups, then see it in the list', async () => {
    const user = await signIn('admin@edusync.demo', 'Admin@12345');
    await screen.findByText('Total students');
    document.body.innerHTML = '';
    mount('/admin/assignments/new');
    await user.click(await screen.findByRole('button', { name: 'Create assignment' }));
    expect(await screen.findByText('Title must be at least 3 characters')).toBeInTheDocument();
    expect(screen.getByText('Enter a full https:// OneDrive link')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Title'), 'UI Test Assignment');
    await user.type(screen.getByLabelText('Due date and time'), '2031-01-15T10:00');
    await user.type(screen.getByLabelText('OneDrive submission link'), 'https://onedrive.live.com/?id=UITEST');
    await user.click(screen.getByLabelText(/Selected groups/));
    await user.click(await screen.findByRole('button', { name: 'Create assignment' }));
    expect(await screen.findByText('Select at least one group')).toBeInTheDocument();
    await user.click(screen.getByLabelText('Gamma Coders', { exact: false }));
    await user.click(screen.getByRole('button', { name: 'Create assignment' }));
    expect(await screen.findByRole('heading', { name: 'UI Test Assignment' })).toBeInTheDocument();
    expect(await screen.findByText('Gamma Coders')).toBeInTheDocument();
    expect(screen.getByText('1 selected group')).toBeInTheDocument();
  });
});

describe('registration and group leadership (UI)', () => {
  test('new student registers, creates a group, invites a classmate, then leaves', async () => {
    const user = userEvent.setup();
    const n = Date.now();
    mount('/register');
    await user.type(await screen.findByLabelText('Full name'), 'UI Tester');
    await user.type(screen.getByLabelText('Email'), `ui${n}@test.dev`);
    await user.type(screen.getByLabelText('Student ID'), `UI${n}`.slice(0, 20));
    await user.type(screen.getByLabelText('Password'), 'Passw0rdX');
    await user.type(screen.getByLabelText('Confirm password'), 'Passw0rdX');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByRole('heading', { name: 'Welcome back, UI' })).toBeInTheDocument();

    await user.click(within(screen.getByRole('navigation', { name: 'Main' })).getByText('My group'));
    await user.click(await screen.findByRole('link', { name: 'Create a group' }));
    await user.type(await screen.findByLabelText('Group name'), `UI Group ${n}`);
    await user.click(screen.getByRole('button', { name: 'Create group' }));
    expect(await screen.findByRole('heading', { name: `UI Group ${n}` })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email or student ID'), 'nobody@nowhere.dev');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));
    expect(await screen.findByText('No student found with that email or student ID')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Email or student ID'));
    await user.type(screen.getByLabelText('Email or student ID'), 'S2024013');
    await user.click(screen.getByRole('button', { name: 'Send invitation' }));
    expect(await screen.findByText('Neha Joshi')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Dissolve group|Leave group/ }));
    await user.click(await screen.findByRole('button', { name: 'Dissolve' }));
    expect(await screen.findByText('You’re not in a group yet')).toBeInTheDocument();
  });
});
