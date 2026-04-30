import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';

interface AppSettings {
  id: number;
  weekStartDay: number;
  weekEndDay: number;
  penaltyDeductionEnabled: boolean;
}

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function Settings() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<AppSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<AppSettings>) => api.patch('/settings', patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  if (isLoading || !settings) return <div className="p-6 text-slate-400">Loading…</div>;

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <div className="space-y-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <h2 className="font-semibold mb-1">Week start day</h2>
          <p className="text-sm text-slate-400 mb-3">
            Week ends on <span className="text-slate-300">{DAY_LABELS[settings.weekEndDay]}</span> · Allowance paid out at 11:59 PM
          </p>
          <select
            value={settings.weekStartDay}
            onChange={(e) =>
              mutation.mutate({ weekStartDay: Number(e.target.value) })
            }
            className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
          >
            {DAY_LABELS.map((d, i) => (
              <option key={i} value={i}>{d}</option>
            ))}
          </select>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Penalty deductions</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Deduct points for unapproved chores during weekly payout
              </p>
            </div>
            <button
              onClick={() =>
                mutation.mutate({ penaltyDeductionEnabled: !settings.penaltyDeductionEnabled })
              }
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.penaltyDeductionEnabled ? 'bg-indigo-600' : 'bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                  settings.penaltyDeductionEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 text-sm text-slate-500 space-y-1">
          <p>Cron schedule (server time):</p>
          <p>· 00:01 — seed chores for new week (on week start day)</p>
          <p>· 01:00 — seed recurring bounties</p>
          <p>· 23:55 — auto-approve zero-penalty chores</p>
          <p>· 23:59 — weekly allowance payout (on week end day)</p>
        </div>
      </div>
    </div>
  );
}
