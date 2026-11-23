import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import Field from '../../components/common/Field';
import { Spinner } from '../../components/common/Feedback';
import { groupApi } from '../../services';
import { errorMessage, fieldErrors } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function CreateGroup() {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) { setError('Group name must be at least 2 characters'); return; }
    setBusy(true); setError('');
    try {
      await groupApi.create(name.trim());
      toast.success('Group created. You are the group leader.');
      navigate('/group', { replace: true });
    } catch (err) { setError(fieldErrors(err).group_name || errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Create a group" subtitle="You’ll become the group leader and can invite classmates afterwards." />
      <form onSubmit={submit} className="card max-w-lg space-y-5 p-6" noValidate>
        <Field label="Group name" error={error} hint="Group names are unique across the class.">
          {(p) => <input {...p} className={`input ${error ? 'input-error' : ''}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus />}
        </Field>
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={busy}>{busy && <Spinner className="!text-white" />}Create group</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </>
  );
}
