import clsx from 'clsx';
import { CheckCircle2, Clock, SkipForward, Flame } from 'lucide-react';

interface Assignment {
  id: number;
  childId: number;
  approvedAt: string | null;
  completedAt: string | null;
  child: { id: number; name: string; avatarEmoji: string };
}

interface Chore {
  id: number;
  name: string;
  penaltyValue: number;
  isShared: boolean;
  dueDate: string;
  status: 'OPEN' | 'COMPLETE' | 'SKIPPED';
  assignments: Assignment[];
}

interface Child {
  id: number;
  name: string;
  avatarEmoji: string;
  pointBalance: number;
  weekStreak: number;
  pendingPrizeCount: number;
}

interface Props {
  child: Child;
  allChores: Chore[];
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  return DAY_LABELS[d.getUTCDay()];
}

export default function ChildCard({ child, allChores }: Props) {
  const myChores = allChores.filter((c) =>
    c.assignments.some((a) => a.childId === child.id)
  );

  const approved = myChores.filter((c) =>
    c.assignments.find((a) => a.childId === child.id)?.approvedAt
  ).length;

  const total = myChores.length;

  return (
    <div className="bg-slate-800 rounded-2xl p-5 flex flex-col gap-4 border border-slate-700">
      {/* Header */}
      <div className="flex items-center gap-4">
        <span className="text-5xl">{child.avatarEmoji}</span>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold truncate">{child.name}</h2>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-indigo-400 font-bold text-lg">{child.pointBalance} pts</span>
            {child.weekStreak > 0 && (
              <span className="flex items-center gap-1 text-amber-400 text-sm font-medium">
                <Flame size={14} />
                {child.weekStreak} week streak
              </span>
            )}
            {child.pendingPrizeCount > 0 && (
              <span className="bg-pink-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {child.pendingPrizeCount} prize{child.pendingPrizeCount > 1 ? 's' : ''} pending
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <span
            className={clsx(
              'text-sm font-semibold',
              total > 0 && approved === total ? 'text-green-400' : 'text-slate-400'
            )}
          >
            {approved}/{total}
          </span>
          <p className="text-xs text-slate-500">done</p>
        </div>
      </div>

      {/* Chore list */}
      {myChores.length > 0 && (
        <div className="space-y-1.5">
          {myChores.map((chore) => {
            const assignment = chore.assignments.find((a) => a.childId === child.id);
            const done = !!assignment?.approvedAt;
            const skipped = chore.status === 'SKIPPED';
            return (
              <div
                key={chore.id}
                className={clsx(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                  done ? 'bg-green-900/30 text-green-300' : skipped ? 'bg-slate-700/40 text-slate-500' : 'bg-slate-700/60 text-slate-200'
                )}
              >
                {done ? (
                  <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                ) : skipped ? (
                  <SkipForward size={14} className="flex-shrink-0" />
                ) : (
                  <Clock size={14} className="text-slate-400 flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{chore.name}</span>
                {chore.isShared && (
                  <span className="text-xs text-slate-500 flex-shrink-0">shared</span>
                )}
                <span className="text-xs text-slate-500 flex-shrink-0 ml-auto">
                  {formatDay(chore.dueDate)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
