import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronRight, GraduationCap, LogOut, Menu, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { analyticsApi, invitationApi } from '../services';
import { fmtDateTime, initials } from '../utils/format';

const LABELS = { admin: 'Admin', dashboard: 'Dashboard', group: 'My group', create: 'Create', invitations: 'Invitations', assignments: 'Assignments',
  profile: 'Profile', new: 'New', edit: 'Edit', submissions: 'Submissions', groups: 'Groups', students: 'Students', analytics: 'Analytics' };

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = parts.map((p, i) => ({ label: LABELS[p] || 'Details', to: `/${parts.slice(0, i + 1).join('/')}` }));
  if (crumbs.length <= 1) return <span className="text-sm font-medium text-ink">{crumbs[0]?.label || 'Dashboard'}</span>;
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
      {crumbs.map((c, i) => (
        <span key={c.to} className="flex min-w-0 items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
          {i === crumbs.length - 1 ? <span className="truncate font-medium text-ink" aria-current="page">{c.label}</span>
            : <Link to={c.to} className="truncate text-slate-500 hover:text-ink">{c.label}</Link>}
        </span>
      ))}
    </nav>
  );
}

function useOutside(ref, cb) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) cb(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, cb]);
}

function Notifications({ role, items, count, onOpen }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button className="btn btn-ghost relative !p-2" aria-label={`Notifications${count ? `, ${count} unread` : ''}`} onClick={() => { setOpen((o) => !o); if (!open) onOpen(); }}>
        <Bell className="h-5 w-5" />
        {count > 0 && <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">{count}</span>}
      </button>
      {open && (
        <div className="pop-in absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white shadow-pop">
          <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">{role === 'ADMIN' ? 'Recent confirmations' : 'Notifications'}</div>
          <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {items.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">You’re all caught up.</li>}
            {items.map((n) => (
              <li key={n.key}>
                <Link to={n.to} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-slate-50">
                  <p className="text-sm text-slate-800">{n.text}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{n.meta}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-slate-100" aria-haspopup="menu" aria-expanded={open}>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-600 text-xs font-semibold text-white">{initials(user.full_name)}</span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-tight">{user.full_name}</span>
          <span className="block text-xs leading-tight text-slate-500">{user.role === 'ADMIN' ? 'Professor' : 'Student'}</span>
        </span>
      </button>
      {open && (
        <div role="menu" className="pop-in absolute right-0 z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-pop">
          <div className="px-3 py-2"><p className="truncate text-sm font-medium">{user.full_name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div>
          <Link role="menuitem" to={user.role === 'ADMIN' ? '/admin/profile' : '/profile'} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><User className="h-4 w-4" />Profile</Link>
          <button role="menuitem" onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4" />Sign out</button>
        </div>
      )}
    </div>
  );
}

function Sidebar({ nav, badges, onNavigate }) {
  return (
    <div className="flex h-full flex-col">
      <Link to="/" className="flex items-center gap-2.5 px-5 py-5" onClick={onNavigate}>
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-600 text-white"><GraduationCap className="h-[18px] w-[18px]" /></span>
        <span className="text-lg font-semibold tracking-tight">EduSync</span>
      </Link>
      <nav className="flex-1 space-y-1 px-3" aria-label="Main">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'}`}>
            <Icon className="h-[18px] w-[18px]" />
            <span className="flex-1">{label}</span>
            {badges[to] > 0 && <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">{badges[to]}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function AppShell({ nav }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const isAdmin = user.role === 'ADMIN';

  const loadNotifications = useCallback(async () => {
    try {
      if (isAdmin) {
        const d = await analyticsApi.admin();
        setItems(d.recent_activity.map((r) => ({ key: `c${r.id}`, to: `/admin/assignments/${r.assignment_id}`, text: `${r.student_name} (${r.group_name}) confirmed “${r.assignment_title}”`, meta: fmtDateTime(r.confirmed_at) + (r.late ? ' · late' : '') })));
        setCount(0);
      } else {
        const inv = (await invitationApi.list()).filter((i) => i.status === 'PENDING');
        setItems(inv.map((i) => ({ key: `i${i.id}`, to: '/invitations', text: `${i.invited_by_name} invited you to join ${i.group_name}`, meta: fmtDateTime(i.created_at) })));
        setCount(inv.length);
      }
    } catch { /* notifications are best-effort */ }
  }, [isAdmin]);

  useEffect(() => { loadNotifications(); }, [loadNotifications, pathname]);
  useEffect(() => { setDrawer(false); }, [pathname]);

  const onLogout = async () => { await logout(); toast.success('You’ve been signed out'); navigate('/login', { replace: true }); };

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block"><Sidebar nav={nav} badges={{ '/invitations': count }} /></aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawer(false)} aria-hidden="true" />
          <aside className="pop-in absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-pop">
            <button className="btn btn-ghost absolute right-2 top-3 !p-2" aria-label="Close menu" onClick={() => setDrawer(false)}><X className="h-5 w-5" /></button>
            <Sidebar nav={nav} badges={{ '/invitations': count }} onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button className="btn btn-ghost !p-2 lg:hidden" aria-label="Open menu" onClick={() => setDrawer(true)}><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><Breadcrumbs /></div>
          <Notifications role={user.role} items={items} count={count} onOpen={loadNotifications} />
          <ProfileMenu user={user} onLogout={onLogout} />
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8"><Outlet /></main>
      </div>
    </div>
  );
}
