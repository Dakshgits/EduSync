import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import useAsync from '../../hooks/useAsync';
import { assignmentApi } from '../../services';
import { errorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import DataTable from '../../components/common/DataTable';
import { AsyncBoundary, EmptyState } from '../../components/common/Feedback';
import { Badge } from '../../components/common/Badges';
import ProgressBar from '../../components/common/ProgressBar';
import ConfirmationModal from '../../components/modals/ConfirmationModal';
import { fmtDate } from '../../utils/format';

export default function ManageAssignments() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const state = useAsync(() => assignmentApi.list(), []);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    setBusy(true);
    try { await assignmentApi.remove(del.id); toast.success(`“${del.title}” was deleted`); setDel(null); await state.reload(); }
    catch (e) { toast.error(errorMessage(e)); setDel(null); } finally { setBusy(false); }
  };

  const cols = [
    { key: 'title', header: 'Assignment', render: (a) => <div className="min-w-[180px]"><p className="font-medium text-ink">{a.title}</p><p className="text-xs text-slate-500">by {a.professor_name}</p></div> },
    { key: 'due', header: 'Due', render: (a) => <span className="whitespace-nowrap">{fmtDate(a.due_date)}</span> },
    { key: 'target', header: 'Assigned to', render: (a) => <Badge tone={a.target_type === 'ALL' ? 'indigo' : 'slate'}>{a.target_type === 'ALL' ? 'All students' : 'Selected groups'}</Badge> },
    { key: 'groups', header: 'Groups fully confirmed', render: (a) => (
      <div className="min-w-[150px]"><p className="mb-1.5 text-xs text-slate-500">{a.submitted_groups}/{a.total_groups} · {a.partial_groups} partial</p><ProgressBar value={a.total_groups ? (100 * a.submitted_groups) / a.total_groups : 0} /></div>) },
    { key: 'actions', header: <span className="sr-only">Actions</span>, render: (a) => (
      <div className="flex justify-end gap-1">
        <Link to={`/admin/assignments/${a.id}`} className="btn btn-ghost btn-sm" aria-label={`Monitor ${a.title}`}><Eye className="h-4 w-4" /></Link>
        {a.created_by === user.id && <>
          <Link to={`/admin/assignments/${a.id}/edit`} className="btn btn-ghost btn-sm" aria-label={`Edit ${a.title}`}><Pencil className="h-4 w-4" /></Link>
          <button className="btn btn-ghost btn-sm text-rose-600 hover:bg-rose-50" aria-label={`Delete ${a.title}`} onClick={() => setDel(a)}><Trash2 className="h-4 w-4" /></button></>}
      </div>) },
  ];

  return (
    <>
      <PageHeader title="Assignments" subtitle="Create, edit and monitor assignments." actions={<Link to="/admin/assignments/new" className="btn btn-primary"><Plus className="h-4 w-4" />New assignment</Link>} />
      <AsyncBoundary state={state}>
        {(rows) => <DataTable columns={cols} rows={rows} onRowClick={(a) => navigate(`/admin/assignments/${a.id}`)}
          empty={<EmptyState icon={ClipboardList} title="No assignments yet" message="Create your first assignment and choose who receives it." action={<Link to="/admin/assignments/new" className="btn btn-primary btn-sm">New assignment</Link>} />} />}
      </AsyncBoundary>
      <ConfirmationModal open={!!del} busy={busy} danger title="Delete assignment" confirmLabel="Delete assignment" cancelLabel="Keep assignment" onClose={() => setDel(null)} onConfirm={remove}
        message={del ? `Delete “${del.title}”? This permanently removes its ${del.total_groups} group submission record${del.total_groups === 1 ? '' : 's'} and ${del.confirmed_members} student confirmation${del.confirmed_members === 1 ? '' : 's'}. This can’t be undone.` : ''} />
    </>
  );
}
