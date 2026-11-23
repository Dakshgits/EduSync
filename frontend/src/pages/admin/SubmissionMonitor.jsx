import { useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import useAsync from '../../hooks/useAsync';
import { assignmentApi, groupApi, submissionApi } from '../../services';
import PageHeader from '../../components/common/PageHeader';
import { AsyncBoundary, EmptyState } from '../../components/common/Feedback';
import SubmissionsTable from '../../components/dashboard/SubmissionsTable';
import InspectSubmissionModal from '../../components/dashboard/InspectSubmissionModal';

export default function SubmissionMonitor() {
  const [filters, setFilters] = useState({ assignment_id: '', group_id: '', status: '' });
  const [inspect, setInspect] = useState(null);
  const options = useAsync(async () => ({ assignments: await assignmentApi.list(), groups: await groupApi.list() }), []);
  const rows = useAsync(() => submissionApi.list(Object.fromEntries(Object.entries(filters).filter(([, v]) => v))), [filters.assignment_id, filters.group_id, filters.status]);
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const active = Object.values(filters).some(Boolean);

  return (
    <>
      <PageHeader title="Submissions" subtitle="Every assignment–group pair, with member-level confirmation status." />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <select aria-label="Filter by assignment" className="input" value={filters.assignment_id} onChange={set('assignment_id')}>
          <option value="">All assignments</option>{(options.data?.assignments || []).map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        <select aria-label="Filter by group" className="input" value={filters.group_id} onChange={set('group_id')}>
          <option value="">All groups</option>{(options.data?.groups || []).map((g) => <option key={g.id} value={g.id}>{g.group_name}</option>)}
        </select>
        <select aria-label="Filter by status" className="input" value={filters.status} onChange={set('status')}>
          <option value="">All statuses</option><option value="SUBMITTED">Fully confirmed</option><option value="PARTIAL">Partially confirmed</option><option value="PENDING">No confirmations</option>
        </select>
      </div>
      <AsyncBoundary state={rows}>
        {(list) => <SubmissionsTable rows={list} onInspect={setInspect}
          empty={<EmptyState icon={FileCheck2} title="No submissions found" message={active ? 'No records match these filters.' : 'Submissions appear once assignments are given to groups.'}
            action={active ? <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ assignment_id: '', group_id: '', status: '' })}>Clear filters</button> : null} />} />}
      </AsyncBoundary>
      <InspectSubmissionModal submissionId={inspect} onClose={() => setInspect(null)} />
    </>
  );
}
