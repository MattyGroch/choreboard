import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import clsx from 'clsx';

interface Child {
  id: number;
  name: string;
  avatarEmoji: string;
  pointBalance: number;
}

interface Transaction {
  id: number;
  amount: number;
  type: 'ALLOWANCE' | 'BOUNTY' | 'PRIZE' | 'MANUAL' | 'PENALTY';
  note: string | null;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  ALLOWANCE: 'text-indigo-300',
  BOUNTY: 'text-amber-300',
  PRIZE: 'text-pink-300',
  MANUAL: 'text-slate-300',
  PENALTY: 'text-red-300',
};

export default function Ledger() {
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ['children-admin'],
    queryFn: () => api.get('/children').then((r) => r.data),
  });

  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', selectedChildId],
    queryFn: () =>
      selectedChildId
        ? api.get(`/children/${selectedChildId}/transactions`).then((r) => r.data)
        : Promise.resolve([]),
    enabled: selectedChildId !== null,
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Point Ledger</h1>

      <div className="flex gap-2 flex-wrap mb-6">
        {children.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedChildId(c.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              selectedChildId === c.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            )}
          >
            <span className="text-lg">{c.avatarEmoji}</span>
            {c.name}
            <span className="text-indigo-300">{c.pointBalance} pts</span>
          </button>
        ))}
      </div>

      {selectedChildId === null && (
        <p className="text-slate-500">Select a child to view their transaction history.</p>
      )}

      {selectedChildId !== null && isLoading && (
        <p className="text-slate-400">Loading…</p>
      )}

      {selectedChildId !== null && !isLoading && transactions.length === 0 && (
        <p className="text-slate-500">No transactions yet.</p>
      )}

      {transactions.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-400 text-left">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Note</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(tx.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className={clsx('px-4 py-3 font-medium', TYPE_COLORS[tx.type])}>
                    {tx.type}
                  </td>
                  <td
                    className={clsx(
                      'px-4 py-3 font-bold',
                      tx.amount >= 0 ? 'text-green-400' : 'text-red-400'
                    )}
                  >
                    {tx.amount >= 0 ? '+' : ''}{tx.amount}
                  </td>
                  <td className="px-4 py-3 text-slate-400">{tx.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
