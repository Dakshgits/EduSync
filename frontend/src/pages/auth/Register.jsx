import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthLayout from '../../layouts/AuthLayout';
import Field from '../../components/common/Field';
import { Spinner } from '../../components/common/Feedback';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage, fieldErrors } from '../../services/api';
import { homeFor } from '../../routes/ProtectedRoute';

const EMPTY = { full_name: '', email: '', student_id: '', password: '', confirm_password: '' };

export default function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={homeFor(user)} replace />;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (form.full_name.trim().length < 2) e.full_name = 'Enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!/^[A-Za-z0-9_-]{3,30}$/.test(form.student_id)) e.student_id = 'Use 3–30 letters, numbers, - or _';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'At least 8 characters with a letter and a number';
    if (form.confirm_password !== form.password) e.confirm_password = 'Passwords do not match';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const local = validate(); setErrors(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await register({ ...form, full_name: form.full_name.trim() });
      toast.success('Account created. Welcome to EduSync!');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(Object.keys(fe).length ? fe : { form: errorMessage(err) });
    } finally { setBusy(false); }
  };

  const inp = (k, extra = {}) => (p) => <input {...p} {...extra} className={`input ${errors[k] ? 'input-error' : ''}`} value={form[k]} onChange={set(k)} />;
  return (
    <AuthLayout title="Create your account" subtitle="Student accounts only. Professor accounts are created by your institution."
      footer={<>Already registered? <Link className="font-medium text-primary-600 hover:text-primary-700" to="/login">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors.form && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{errors.form}</div>}
        <Field label="Full name" error={errors.full_name}>{inp('full_name', { autoComplete: 'name' })}</Field>
        <Field label="Email" error={errors.email}>{inp('email', { type: 'email', autoComplete: 'email' })}</Field>
        <Field label="Student ID" error={errors.student_id} hint="Your college roll or enrolment number.">{inp('student_id')}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" error={errors.password}>{inp('password', { type: 'password', autoComplete: 'new-password' })}</Field>
          <Field label="Confirm password" error={errors.confirm_password}>{inp('confirm_password', { type: 'password', autoComplete: 'new-password' })}</Field>
        </div>
        <button className="btn btn-primary w-full" disabled={busy}>{busy && <Spinner className="!text-white" />}Create account</button>
      </form>
    </AuthLayout>
  );
}
