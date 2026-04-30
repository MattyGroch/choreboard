import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import ChildCard from '../components/dashboard/ChildCard';
import BountyBoard from '../components/dashboard/BountyBoard';
import PrizeShop from '../components/dashboard/PrizeShop';

function getThisWeekStart() {
  const today = new Date();
  const dow = today.getUTCDay();
  const ms = today.getTime() - dow * 86400000;
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export default function Dashboard() {
  const qc = useQueryClient();

  const { data: children = [] } = useQuery({
    queryKey: ['children'],
    queryFn: () => api.get('/children').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: chores = [] } = useQuery({
    queryKey: ['chores', getThisWeekStart()],
    queryFn: () =>
      api.get('/chores', { params: { weekStart: getThisWeekStart() } }).then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: bounties = [] } = useQuery({
    queryKey: ['bounties'],
    queryFn: () => api.get('/bounties').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: prizes = [] } = useQuery({
    queryKey: ['prizes'],
    queryFn: () => api.get('/prizes').then((r) => r.data),
    refetchInterval: 60_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['children'] });
    qc.invalidateQueries({ queryKey: ['bounties'] });
  };

  // Keep screen alive on kiosk
  useEffect(() => {
    if (navigator.wakeLock) {
      navigator.wakeLock.request('screen').catch(() => null);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 lg:p-8 overflow-auto">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-indigo-400 tracking-tight">
          ChoreBoard
        </h1>
        <a
          href="/admin"
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
        >
          Admin
        </a>
      </header>

      {/* Children grid */}
      <div
        className="grid gap-4 mb-8"
        style={{
          gridTemplateColumns: `repeat(${Math.min(children.length, 4)}, minmax(0, 1fr))`,
        }}
      >
        {children.map(
          (child: {
            id: number;
            name: string;
            avatarEmoji: string;
            pointBalance: number;
            weekStreak: number;
            pendingPrizeCount: number;
          }) => (
            <ChildCard key={child.id} child={child} allChores={chores} />
          )
        )}
      </div>

      {/* Bounty Board */}
      <div className="mb-8">
        <BountyBoard bounties={bounties} children={children} onClaimed={invalidate} />
      </div>

      {/* Prize Shop */}
      <PrizeShop prizes={prizes} children={children} onRequested={invalidate} />
    </div>
  );
}
