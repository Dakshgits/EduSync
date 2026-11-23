import { useMemo, useState } from 'react';
import { GraduationCap, Search } from 'lucide-react';
import useAsync from '../../hooks/useAsync';
import { analyticsApi } from '../../services';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import { AsyncBoundary, EmptyState } from '../../components/common/Feedback';
import { Badge, RoleBadge } from '../../components/common/Badges';
import ProgressBar from '../../components/common/ProgressBar';
import { fmtDateTime } from '../../utils/format';

export default function StudentMonitoring() {
  const state = useAsync(() => analyticsApi.students(), []);
  const [q, setQ] = useState('');
  const [grp, setGrp] = useState('');
  const groups = useMemo(() => [...new Set((state.data || []).map((s) => s.group_name).filter(Boolean))].sort(), [state.data]);
  const rows = useMemo(() => (state.data || []).filter((s) => (!grp || (grp === '__none' ? !s.group_name : s.group_name === grp))
    && `${s.full_name} ${s.email} ${s.student_id}`.toLowerCase().includes(q.toLowerCase())), [state.data, q, grp]);

  const cols = [
    { key: 'name', header: 'Student', render: (s) => <div className="min-w-[160px]"><p className="font-medium text-ink">{s.full_name}</p><p className="text-xs text-slate-500">{s.student_id} · {s.email}</p></div> },
    { key: 'group', header: 'Group', render: (s) => (s.group_name ? <span className="flex items-center gap-2 whitespace-nowrap">{s.group_name}<RoleBadge role={s.member_role} /></span> : <Badge>No group</Badge>) },
    { key: 'conf', header: 'Confirmed', render: (s) => (s.group_name ? <div className="flex min-w-[140px] items-center gap-2"><ProgressBar className="flex-1" value={s.assigned ? (100 * s.confirmed) / s.assigned : 0} /><span className="whitespace-nowrap text-xs text-slate-600">{s.confirmed}/{s.assigned}</span></div> : '—') },
    { key: 'last', header: 'Last confirmation', render: (s) => <span className="whitespace-nowrap text-xs text-slate-500">{fmtDateTime(s.last_confirmed_at)}</span> },
  ];
  return (
    <>
      <PageHeader title="Students" subtitle="Individual confirmation progress for every registered student." />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search students" className="input pl-9" placeholder="Search by name, email or student ID" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select aria-label="Filter by group" className="input sm:w-52" value={grp} onChange={(e) => setGrp(e.target.value)}><option value="">All groups</option><option value="__none">Not in a group</option>{groups.map((g) => <option key={g} value={g}>{g}</option>)}</select>
      </div>
      <AsyncBoundary state={state}>
        {() => <DataTable columns={cols} rows={rows} empty={<EmptyState icon={GraduationCap} title="No students found" message="Try a different search or group filter." />} />}
      </AsyncBoundary>
    </>
  );
}
