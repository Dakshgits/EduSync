import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const C = { submitted: '#10b981', partial: '#f59e0b', pending: '#cbd5e1', primary: '#4f46e5' };
const tip = { contentStyle: { borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 10px 30px -10px rgba(15,23,42,.25)' } };
const short = (s, n = 14) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Submitted vs partial vs pending (assignment × group records). */
export function StatusDonut({ submitted, partial, pending }) {
  const data = [{ name: 'Fully confirmed', value: submitted, fill: C.submitted }, { name: 'Partially confirmed', value: partial, fill: C.partial }, { name: 'No confirmations', value: pending, fill: C.pending }];
  const total = submitted + partial + pending;
  if (!total) return <p className="py-16 text-center text-sm text-slate-500">No submissions to chart yet.</p>;
  return (
    <div className="h-64" role="img" aria-label={`${submitted} fully confirmed, ${partial} partially confirmed, ${pending} with no confirmations`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} stroke="none" isAnimationActive={false}>
            {data.map((d) => <Cell key={d.name} fill={d.fill} />)}
          </Pie>
          <Tooltip {...tip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Stacked bars per assignment. */
export function AssignmentBars({ rows }) {
  if (!rows.length) return <p className="py-16 text-center text-sm text-slate-500">No assignments yet.</p>;
  const data = rows.map((r) => ({ name: short(r.title), Fully: r.submitted, Partial: r.partial, None: r.pending }));
  return (
    <div className="h-72" role="img" aria-label="Assignment-wise submission status">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -16, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip {...tip} cursor={{ fill: '#f1f5f9' }} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Fully" stackId="a" fill={C.submitted} isAnimationActive={false} />
          <Bar dataKey="Partial" stackId="a" fill={C.partial} isAnimationActive={false} />
          <Bar dataKey="None" stackId="a" fill={C.pending} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Average member-confirmation progress per group. */
export function GroupProgressBars({ rows }) {
  if (!rows.length) return <p className="py-16 text-center text-sm text-slate-500">No groups yet.</p>;
  const data = rows.map((r) => ({ name: short(r.group_name, 16), 'Average progress (%)': r.avg_progress }));
  return (
    <div className="h-72" role="img" aria-label="Group-wise average progress">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -16, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={0} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip {...tip} cursor={{ fill: '#f1f5f9' }} />
          <Bar dataKey="Average progress (%)" fill={C.primary} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
