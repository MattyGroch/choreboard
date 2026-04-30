import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <p className="text-slate-400 text-sm">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function getThisWeekStart() {
  const today = new Date();
  const dow = today.getUTCDay();
  const d = new Date(today.getTime() - dow * 86400000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export default function Overview() {
  const { data: chores = [] } = useQuery({
    queryKey: ['chores', getThisWeekStart()],
    queryFn: () =>
      api.get('/chores', { params: { weekStart: getThisWeekStart() } }).then((r) => r.data),
  });

  const { data: prizeRequests = [] } = useQuery({
    queryKey: ['prize-requests', 'PENDING'],
    queryFn: () => api.get('/prize-requests', { params: { status: 'PENDING' } }).then((r) => r.data),
  });

  const { data: bountyClaims = [] } = useQuery({
    queryKey: ['bounty-claims-pending'],
    queryFn: () => api.get('/bounties').then((r) => r.data),
  });

  const totalAssignments = chores.flatMap(
    (c: { assignments: unknown[] }) => c.assignments
  ).length;

  const approvedAssignments = chores
    .flatMap((c: { assignments: { approvedAt: string | null }[] }) => c.assignments)
    .filter((a: { approvedAt: string | null }) => a.approvedAt).length;

  const completionRate =
    totalAssignments > 0 ? Math.round((approvedAssignments / totalAssignments) * 100) : 0;

  const pendingApprovals = chores
    .flatMap((c: { assignments: { approvedAt: string | null }[]; status: string }) =>
      c.status === 'OPEN' ? c.assignments.filter((a) => !a.approvedAt) : []
    ).length;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Overview</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Pending approvals" value={pendingApprovals} sub="chore assignments" />
        <StatCard label="Pending prize requests" value={prizeRequests.length} />
        <StatCard
          label="This week's completion"
          value={`${completionRate}%`}
          sub={`${approvedAssignments} of ${totalAssignments} assignments`}
        />
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <h2 className="font-semibold mb-3 text-slate-300">Open bounty claims</h2>
        {bountyClaims.length === 0 ? (
          <p className="text-slate-500 text-sm">No active bounties</p>
        ) : (
          <p className="text-slate-400 text-sm">{bountyClaims.length} active bounties available</p>
        )}
      </div>
    </div>
  );
}
