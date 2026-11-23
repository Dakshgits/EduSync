import { useMemo, useState } from 'react';
import { ClipboardList, Search } from 'lucide-react';
import useAsync from '../../hooks/useAsync';
import { assignmentApi } from '../../services';
import PageHeader from '../../components/common/PageHeader';
import { AsyncBoundary, CardSkeletons, EmptyState } from '../../components/common/Feedback';
import AssignmentCard from '../../components/dashboard/AssignmentCard';
import { studentState } from '../../utils/format';

const FILTERS = [['all', 'All statuses'], ['pending', 'Pending'], ['submitted', 'Submitted'], ['completed', 'Completed'], ['overdue', 'Overdue']];

export default function Assignments() {
  const state = useAsync(() => assignmentApi.list(), []);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('asc');

  const filtered = useMemo(() => {
    const list = (state.data || []).filter((a) => (status === 'all' || studentState(a) === status)
      && (`${a.title} ${a.description} ${a.professor_name}`).toLowerCase().includes(q.trim().toLowerCase()));
    return list.sort((x, y) => (sort === 'asc' ? 1 : -1) * (new Date(x.due_date) - new Date(y.due_date)));
  }, [state.data, q, status, sort]);

  return (
    <>
      <PageHeader title="Assignments" subtitle="Everything assigned to you or your group." />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input aria-label="Search assignments" className="input pl-9" placeholder="Search by title, description or professor" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Filter by status" className="input sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}>{FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select aria-label="Sort by due date" className="input sm:w-48" value={sort} onChange={(e) => setSort(e.target.value)}><option value="asc">Due date: soonest first</option><option value="desc">Due date: latest first</option></select>
      </div>
      <AsyncBoundary state={state} skeleton={<CardSkeletons count={6} className="h-56" />}>
        {(all) => filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title={all.length === 0 ? 'No assignments yet' : 'No assignments match'} message={all.length === 0 ? 'Your professor hasn’t assigned anything to you yet.' : 'Try a different search or status filter.'} />
        ) : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((a) => <AssignmentCard key={a.id} a={a} />)}</div>}
      </AsyncBoundary>
    </>
  );
}
