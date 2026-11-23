import { Link } from 'react-router-dom';
import { GraduationCap, CheckCheck, Users, LineChart } from 'lucide-react';

const POINTS = [
  [Users, 'Form your group', 'Invite classmates by email or student ID.'],
  [CheckCheck, 'Confirm together', 'A group is done when every member has confirmed.'],
  [LineChart, 'Professors see progress', 'Member-by-member status for every assignment.'],
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="hidden flex-col justify-between bg-primary-900 p-12 text-primary-100 lg:flex">
        <Link to="/" className="flex items-center gap-2.5 text-white">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10"><GraduationCap className="h-5 w-5" /></span>
          <span className="text-xl font-semibold tracking-tight">EduSync</span>
        </Link>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">Know exactly who has handed in what.</h2>
          <ul className="mt-10 space-y-6">
            {POINTS.map(([Icon, head, body]) => (
              <li key={head} className="flex gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-white"><Icon className="h-[18px] w-[18px]" /></span>
                <div><p className="font-medium text-white">{head}</p><p className="text-sm text-primary-200">{body}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-primary-300">Submissions stay in OneDrive. EduSync tracks who confirmed.</p>
      </aside>
      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-600 text-white"><GraduationCap className="h-5 w-5" /></span>
            <span className="text-xl font-semibold tracking-tight">EduSync</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
