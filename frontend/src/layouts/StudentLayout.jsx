import { ClipboardList, LayoutDashboard, MailPlus, User, Users } from 'lucide-react';
import AppShell from './AppShell';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/group', label: 'My group', icon: Users },
  { to: '/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/invitations', label: 'Invitations', icon: MailPlus },
  { to: '/profile', label: 'Profile', icon: User },
];
export default function StudentLayout() { return <AppShell nav={NAV} />; }
