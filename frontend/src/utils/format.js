const opts = { day: 'numeric', month: 'short', year: 'numeric' };
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, opts) : '—');
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { ...opts, hour: 'numeric', minute: '2-digit' }) : '—';

/** "in 3 days", "due today", "2 days overdue" */
export function dueLabel(d) {
  const diff = new Date(d).getTime() - Date.now();
  const days = Math.ceil(diff / 864e5);
  if (diff < 0) { const o = Math.floor(-diff / 864e5); return o === 0 ? 'due earlier today' : `${o} day${o === 1 ? '' : 's'} overdue`; }
  if (days <= 1) return 'due within a day';
  return `due in ${days} days`;
}

export const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

/** What a student sees on an assignment card (the spec's four badges). */
export function studentState(a) {
  if (a.is_overdue) return 'overdue';
  if (a.status === 'SUBMITTED') return 'completed';
  if (a.my_confirmed) return 'submitted';
  return 'pending';
}

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0].toUpperCase()).join('');
