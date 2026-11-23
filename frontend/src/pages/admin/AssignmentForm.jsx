import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import useAsync from '../../hooks/useAsync';
import { assignmentApi, groupApi } from '../../services';
import { errorMessage, fieldErrors } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import Field from '../../components/common/Field';
import { AsyncBoundary, Spinner } from '../../components/common/Feedback';
import { toLocalInput } from '../../utils/format';

const blank = () => ({ title: '', description: '', due_date: '', onedrive_link: '', target_type: 'ALL', group_ids: [] });

/** Used for both "Create assignment" (/admin/assignments/new) and "Edit assignment" (/admin/assignments/:id/edit). */
export default function AssignmentForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const state = useAsync(async () => {
    const [groups, existing] = await Promise.all([groupApi.list(), editing ? assignmentApi.get(id) : null]);
    return { groups, existing };
  }, [id]);
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    const a = state.data?.existing;
    if (a) setForm({ title: a.title, description: a.description || '', due_date: toLocalInput(a.due_date), onedrive_link: a.onedrive_link, target_type: a.target_type, group_ids: a.group_ids || [] });
  }, [state.data]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = (gid) => setForm((f) => ({ ...f, group_ids: f.group_ids.includes(gid) ? f.group_ids.filter((x) => x !== gid) : [...f.group_ids, gid] }));
  const groups = state.data?.groups || [];
  const visible = useMemo(() => groups.filter((g) => g.group_name.toLowerCase().includes(filter.toLowerCase())), [groups, filter]);

  const validate = () => {
    const e = {};
    if (form.title.trim().length < 3) e.title = 'Title must be at least 3 characters';
    if (!form.due_date || Number.isNaN(new Date(form.due_date).getTime())) e.due_date = 'Choose a due date and time';
    if (!/^https:\/\//i.test(form.onedrive_link.trim())) e.onedrive_link = 'Enter a full https:// OneDrive link';
    if (form.target_type === 'SELECTED_GROUPS' && form.group_ids.length === 0) e.group_ids = 'Select at least one group';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const local = validate(); setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    const body = { ...form, title: form.title.trim(), onedrive_link: form.onedrive_link.trim(), due_date: new Date(form.due_date).toISOString(),
      group_ids: form.target_type === 'SELECTED_GROUPS' ? form.group_ids : [] };
    try {
      const saved = editing ? await assignmentApi.update(id, body) : await assignmentApi.create(body);
      toast.success(editing ? 'Assignment updated' : 'Assignment created');
      navigate(`/admin/assignments/${saved.id}`, { replace: true });
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(Object.keys(fe).length ? fe : { form: errorMessage(err) });
    } finally { setBusy(false); }
  };

  const inp = (k, extra = {}) => (p) => <input {...p} {...extra} className={`input ${errors[k] ? 'input-error' : ''}`} value={form[k]} onChange={set(k)} />;

  return (
    <>
      <PageHeader title={editing ? 'Edit assignment' : 'New assignment'} subtitle="Students open the OneDrive link, upload their work, then confirm inside EduSync." />
      <AsyncBoundary state={state}>
        {() => (
          <form onSubmit={submit} className="grid gap-6 lg:grid-cols-5" noValidate>
            <div className="card space-y-5 p-6 lg:col-span-3">
              {errors.form && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{errors.form}</div>}
              <Field label="Title" error={errors.title}>{inp('title', { maxLength: 200 })}</Field>
              <Field label="Description" error={errors.description} hint="Instructions, marking criteria, file naming rules.">
                {(p) => <textarea {...p} rows={5} className="input" value={form.description} onChange={set('description')} maxLength={5000} />}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Due date and time" error={errors.due_date}>{inp('due_date', { type: 'datetime-local' })}</Field>
                <Field label="OneDrive submission link" error={errors.onedrive_link}>{inp('onedrive_link', { type: 'url', placeholder: 'https://1drv.ms/…' })}</Field>
              </div>
            </div>

            <div className="card space-y-4 p-6 lg:col-span-2">
              <fieldset>
                <legend className="text-sm font-medium text-slate-700">Assign to</legend>
                <div className="mt-2 space-y-2">
                  {[['ALL', 'All students', 'Every group, including groups created later.'], ['SELECTED_GROUPS', 'Selected groups', 'Only the groups you choose below.']].map(([v, l, h]) => (
                    <label key={v} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${form.target_type === v ? 'border-primary-500 bg-primary-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <input type="radio" name="target" className="mt-1 accent-primary-600" checked={form.target_type === v} onChange={() => setForm((f) => ({ ...f, target_type: v }))} />
                      <span><span className="block text-sm font-medium">{l}</span><span className="block text-xs text-slate-500">{h}</span></span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {form.target_type === 'SELECTED_GROUPS' && (
                <div>
                  <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Search groups" className="input pl-9" placeholder="Search groups" value={filter} onChange={(e) => setFilter(e.target.value)} /></div>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{form.group_ids.length} selected</span>
                    <span className="flex gap-3">
                      <button type="button" className="font-medium text-primary-600 hover:underline" onClick={() => setForm((f) => ({ ...f, group_ids: groups.map((g) => g.id) }))}>Select all</button>
                      <button type="button" className="font-medium text-primary-600 hover:underline" onClick={() => setForm((f) => ({ ...f, group_ids: [] }))}>Clear</button>
                    </span>
                  </div>
                  <ul className="mt-2 max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200" aria-label="Groups">
                    {visible.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate-500">{groups.length ? 'No groups match.' : 'No groups exist yet.'}</li>}
                    {visible.map((g) => (
                      <li key={g.id}>
                        <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-slate-50">
                          <input type="checkbox" className="h-4 w-4 accent-primary-600" checked={form.group_ids.includes(g.id)} onChange={() => toggle(g.id)} />
                          <span className="flex-1 text-sm">{g.group_name}</span><span className="text-xs text-slate-500">{g.member_count} members</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  {errors.group_ids && <p className="mt-1.5 text-xs text-rose-600" role="alert">{errors.group_ids}</p>}
                </div>
              )}
            </div>

            <div className="flex gap-2 lg:col-span-5">
              <button className="btn btn-primary" disabled={busy}>{busy && <Spinner className="!text-white" />}{editing ? 'Save changes' : 'Create assignment'}</button>
              <Link to={editing ? `/admin/assignments/${id}` : '/admin/assignments'} className="btn btn-secondary">Cancel</Link>
            </div>
          </form>
        )}
      </AsyncBoundary>
    </>
  );
}
