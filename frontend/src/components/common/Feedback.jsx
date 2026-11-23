import { Loader2, AlertTriangle, Inbox } from 'lucide-react';

export const Spinner = ({ className = 'h-4 w-4' }) => <Loader2 className={`animate-spin text-primary-600 ${className}`} aria-label="Loading" />;

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-slate-200/70 ${className}`} aria-hidden="true" />;
}

export function CardSkeletons({ count = 3, className = 'h-32' }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => <Skeleton key={i} className={`${className} rounded-xl`} />)}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}</div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-primary-50 text-primary-600"><Icon className="h-5 w-5" /></div>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center" role="alert">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-rose-50 text-rose-600"><AlertTriangle className="h-5 w-5" /></div>
      <h3 className="text-sm font-semibold text-ink">We couldn’t load this</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
      {onRetry && <button className="btn btn-secondary mt-4" onClick={onRetry}>Try again</button>}
    </div>
  );
}

/** Shows skeleton / error / empty / content for a useAsync result. */
export function AsyncBoundary({ state, skeleton = <PageSkeleton />, children }) {
  if (state.loading && !state.data) return skeleton;
  if (state.error && !state.data) return <ErrorState message={state.error} onRetry={state.retry} />;
  return children(state.data);
}
