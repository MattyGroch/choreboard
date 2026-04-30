import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

interface Child {
  id: number;
  name: string;
  avatarEmoji: string;
  pointBalance: number;
}

export default function ManualAdjustment() {
  const qc = useQueryClient();
  const [childId, setChildId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ['children-admin'],
    queryFn: () => api.get('/children').then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/transactions', {
        childId: Number(childId),
        amount: Number(amount),
        note,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['children-admin'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      const child = children.find((c) => c.id === Number(childId));
      setSuccess(
        `Adjusted ${child?.name}'s balance by ${Number(amount) >= 0 ? '+' : ''}${amount} pts`
      );
      setAmount('');
      setNote('');
      setError('');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Something went wrong';
      setError(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    mutation.mutate();
  };

  const selectedChild = children.find((c) => c.id === Number(childId));

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Manual Point Adjustment</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Child</label>
          <select
            value={childId}
            onChange={(e) => setChildId(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
            required
          >
            <option value="">Select a child…</option>
            {children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.avatarEmoji} {c.name} ({c.pointBalance} pts)
              </option>
            ))}
          </select>
        </div>

        {selectedChild && (
          <p className="text-sm text-slate-400">
            Current balance: <span className="text-indigo-300 font-medium">{selectedChild.pointBalance} pts</span>
          </p>
        )}

        <div>
          <label className="block text-sm text-slate-400 mb-1">
            Amount (positive to add, negative to deduct)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 10 or -5"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm text-slate-400 mb-1">Note (required)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Bonus for helping with yardwork"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">{success}</p>}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg font-semibold transition-colors"
        >
          {mutation.isPending ? 'Applying…' : 'Apply adjustment'}
        </button>
      </form>
    </div>
  );
}
