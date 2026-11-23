import { BarChart3, ClipboardList, FileCheck2, GraduationCap, LayoutDashboard, User, Users } from 'lucide-react';
import AppShell from './AppShell';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/admin/submissions', label: 'Submissions', icon: FileCheck2 },
  { to: '/admin/groups', label: 'Groups', icon: Users },
  { to: '/admin/students', label: 'Students', icon: GraduationCap },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/profile', label: 'Profile', icon: User },
];
export default function AdminLayout() { return <AppShell nav={NAV} />; }
