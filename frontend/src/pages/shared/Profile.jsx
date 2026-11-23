import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../services';
import { errorMessage, fieldErrors } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Field from '../../components/common/Field';
import { Spinner } from '../../components/common/Feedback';
import { Badge } from '../../components/common/Badges';
import { initials } from '../../utils/format';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.full_name);
  const [nameErr, setNameErr] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwErr, setPwErr] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  const saveName = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) { setNameErr('Enter your full name'); return; }
    setSavingName(true); setNameErr('');
    try { const d = await authApi.updateProfile({ full_name: name.trim() }); setUser(d.user); toast.success('Profile updated'); }
    catch (err) { setNameErr(fieldErrors(err).full_name || errorMessage(err)); } finally { setSavingName(false); }
  };
  const savePw = async (e) => {
    e.preventDefault();
    const l = {};
    if (!pw.current_password) l.current_password = 'Enter your current password';
    if (pw.new_password.length < 8 || !/[A-Za-z]/.test(pw.new_password) || !/\d/.test(pw.new_password)) l.new_password = 'At least 8 characters with a letter and a number';
    if (pw.confirm_password !== pw.new_password) l.confirm_password = 'Passwords do not match';
    setPwErr(l);
    if (Object.keys(l).length) return;
    setSavingPw(true);
    try { await authApi.changePassword(pw); toast.success('Password changed'); setPw({ current_password: '', new_password: '', confirm_password: '' }); }
    catch (err) { const f = fieldErrors(err); setPwErr(Object.keys(f).length ? f : { current_password: errorMessage(err) }); } finally { setSavingPw(false); }
  };
  const pwInput = (k, ac) => (p) => <input {...p} type="password" autoComplete={ac} className={`input ${pwErr[k] ? 'input-error' : ''}`} value={pw[k]} onChange={(e) => setPw((s) => ({ ...s, [k]: e.target.value }))} />;

  return (
    <>
      <PageHeader title="Profile" subtitle="Your account details." />
      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-primary-600 text-lg font-semibold text-white">{initials(user.full_name)}</span>
            <div className="min-w-0"><p className="truncate font-semibold">{user.full_name}</p><Badge tone="indigo" className="mt-1">{user.role === 'ADMIN' ? 'Professor' : 'Student'}</Badge></div>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div><dt className="text-slate-500">Email</dt><dd className="font-medium">{user.email}</dd></div>
            {user.student_id && <div><dt className="text-slate-500">Student ID</dt><dd className="font-medium">{user.student_id}</dd></div>}
          </dl>
          <form onSubmit={saveName} className="mt-6 space-y-4 border-t border-slate-100 pt-5" noValidate>
            <Field label="Full name" error={nameErr}>{(p) => <input {...p} className={`input ${nameErr ? 'input-error' : ''}`} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
            <button className="btn btn-primary" disabled={savingName || name.trim() === user.full_name}>{savingName && <Spinner className="!text-white" />}Save name</button>
          </form>
        </section>
        <section className="card p-6">
          <h2 className="text-base font-semibold">Change password</h2>
          <form onSubmit={savePw} className="mt-4 space-y-4" noValidate>
            <Field label="Current password" error={pwErr.current_password}>{pwInput('current_password', 'current-password')}</Field>
            <Field label="New password" error={pwErr.new_password}>{pwInput('new_password', 'new-password')}</Field>
            <Field label="Confirm new password" error={pwErr.confirm_password}>{pwInput('confirm_password', 'new-password')}</Field>
            <button className="btn btn-primary" disabled={savingPw}>{savingPw && <Spinner className="!text-white" />}Update password</button>
          </form>
        </section>
      </div>
    </>
  );
}
