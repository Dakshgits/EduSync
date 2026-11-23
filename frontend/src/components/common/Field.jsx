import { useId } from 'react';

/** Label + input + error. Pass the control as children using the provided id via render-prop or just use `input` props. */
export default function Field({ label, error, hint, children, className = '' }) {
  const id = useId();
  const control = typeof children === 'function' ? children({ id, 'aria-invalid': !!error, 'aria-describedby': error ? `${id}-err` : undefined }) : children;
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>}
      {control}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-err`} className="mt-1 text-xs text-rose-600" role="alert">{error}</p>}
    </div>
  );
}
