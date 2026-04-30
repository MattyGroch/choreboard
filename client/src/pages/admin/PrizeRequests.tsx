import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, XCircle } from 'lucide-react';
import api from '../../lib/api';

interface PrizeRequest {
  id: number;
  status: 'PENDING' | 'GIVEN' | 'CANCELLED';
  requestedAt: string;
  givenAt: string | null;
  child: { id: number; name: string; avatarEmoji: string };
  prize: { id: number; name: string; pointCost: number };
}

export default function PrizeRequests() {
  const qc = useQueryClient();

  const { data: requests = [], isLoading } = useQuery<PrizeRequest[]>({
    queryKey: ['prize-requests', 'PENDING'],
    queryFn: () => api.get('/prize-requests', { params: { status: 'PENDING' } }).then((r) => r.data),
  });

  const giveMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/prize-requests/${id}/give`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prize-requests'] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/prize-requests/${id}/cancel`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prize-requests'] }),
  });

  if (isLoading) return <div className="p-6 text-slate-400">Loading…</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Prize Requests</h1>

      {requests.length === 0 ? (
        <p className="text-slate-500">No pending prize requests.</p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-4 bg-slate-800 border border-slate-700 rounded-xl p-4"
            >
              <span className="text-3xl">{r.child.avatarEmoji}</span>
              <div className="flex-1">
                <p className="font-semibold">{r.child.name}</p>
                <p className="text-sm text-slate-300">{r.prize.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {r.prize.pointCost} pts · Requested{' '}
                  {new Date(r.requestedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => giveMutation.mutate(r.id)}
                  disabled={giveMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 rounded-lg text-sm font-medium"
                >
                  <CheckCircle2 size={15} />
                  Mark given
                </button>
                <button
                  onClick={() => cancelMutation.mutate(r.id)}
                  disabled={cancelMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-sm text-slate-300"
                >
                  <XCircle size={15} />
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
