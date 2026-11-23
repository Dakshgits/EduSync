import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import Field from '../../components/common/Field';
import { Spinner } from '../../components/common/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage, fieldErrors } from '../../services/api';
import { homeFor } from '../../routes/ProtectedRoute';

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user)} replace />;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const local = {};
    if (!/^\S+@\S+\.\S+$/.test(form.email)) local.email = 'Enter a valid email address';
    if (!form.password) local.password = 'Password is required';
    setErrors(local); setBanner('');
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      const u = await login(form);
      toast.success(`Welcome back, ${u.full_name.split(' ')[0]}`);
      const from = location.state?.from;
      const allowed = from && ((u.role === 'ADMIN') === from.startsWith('/admin'));
      navigate(allowed ? from : homeFor(u), { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err)); setBanner(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <AuthLayout title="Sign in" subtitle="Use the email and password for your EduSync account."
      footer={<>New student? <Link className="font-medium text-primary-600 hover:text-primary-700" to="/register">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {banner && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{banner}</div>}
        <Field label="Email" error={errors.email}>{(p) => <input {...p} type="email" autoComplete="email" className={`input ${errors.email ? 'input-error' : ''}`} value={form.email} onChange={set('email')} placeholder="you@college.edu" />}</Field>
        <Field label="Password" error={errors.password}>{(p) => <input {...p} type="password" autoComplete="current-password" className={`input ${errors.password ? 'input-error' : ''}`} value={form.password} onChange={set('password')} />}</Field>
        <button className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner className="!text-white" />}Sign in</button>
      </form>
    </AuthLayout>
  );
}
