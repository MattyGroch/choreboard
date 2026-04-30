import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { CheckCircle2, Clock, SkipForward, Flame, Loader2 } from 'lucide-react';
import api from '../../lib/api';
import PinModal from './PinModal';

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
  hasPin: boolean;
}

interface Props {
  child: Child;
  allChores: Chore[];
}

function todayUTCPrefix() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export default function ChildCard({ child, allChores }: Props) {
  const qc = useQueryClient();
  const today = todayUTCPrefix();
  const myChores = allChores.filter((c) =>
    c.dueDate.startsWith(today) &&
    c.assignments.some((a) => a.childId === child.id)
  );

  const [pendingAssignmentId, setPendingAssignmentId] = useState<number | null>(null);

  const completeMutation = useMutation({
    mutationFn: ({ assignmentId, pin }: { assignmentId: number; pin?: string }) =>
      api.patch(`/chores/assignments/${assignmentId}/complete`, { pin }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chores'] });
    },
  });

  const handleChoreClick = (assignment: Assignment) => {
    if (assignment.completedAt || assignment.approvedAt) return;
    setPendingAssignmentId(assignment.id);
  };

  const handleConfirm = async (_childId: number, pin?: string) => {
    if (!pendingAssignmentId) return;
    await completeMutation.mutateAsync({ assignmentId: pendingAssignmentId, pin });
  };

  const approved = myChores.filter((c) =>
    c.assignments.find((a) => a.childId === child.id)?.approvedAt
  ).length;

  const completed = myChores.filter((c) => {
    const a = c.assignments.find((x) => x.childId === child.id);
    return a?.completedAt && !a.approvedAt;
  }).length;

  const total = myChores.length;

  // Synthetic child object for PinModal — pin value indicates whether PIN is required
  const pinModalChild = { ...child, pin: child.hasPin ? '____' : null };

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
            if (!assignment) return null;
            const approved = !!assignment.approvedAt;
            const pendingApproval = !!assignment.completedAt && !assignment.approvedAt;
            const skipped = chore.status === 'SKIPPED';
            const isLoading = completeMutation.isPending && pendingAssignmentId === assignment.id;
            const clickable = !approved && !pendingApproval && !skipped;

            return (
              <button
                key={chore.id}
                type="button"
                disabled={!clickable || isLoading}
                onClick={() => handleChoreClick(assignment)}
                className={clsx(
                  'w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left transition-colors',
                  approved
                    ? 'bg-green-900/30 text-green-300'
                    : pendingApproval
                    ? 'bg-blue-900/30 text-blue-300'
                    : skipped
                    ? 'bg-slate-700/40 text-slate-500'
                    : 'bg-slate-700/60 text-slate-200 hover:bg-slate-600/60 active:scale-[0.98] cursor-pointer'
                )}
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin flex-shrink-0" />
                ) : approved ? (
                  <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />
                ) : pendingApproval ? (
                  <CheckCircle2 size={14} className="text-blue-400 flex-shrink-0" />
                ) : skipped ? (
                  <SkipForward size={14} className="flex-shrink-0" />
                ) : (
                  <Clock size={14} className="text-slate-400 flex-shrink-0" />
                )}
                <span className="flex-1 truncate">{chore.name}</span>
                {pendingApproval && (
                  <span className="text-xs text-blue-400/70 flex-shrink-0">pending approval</span>
                )}
                {chore.isShared && (
                  <span className="text-xs text-slate-500 flex-shrink-0">shared</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* PIN modal for marking chore done */}
      {pendingAssignmentId !== null && (
        <PinModal
          title="Mark chore done"
          subtitle={myChores
            .flatMap((c) => c.assignments)
            .find((a) => a.id === pendingAssignmentId)
            ? myChores.find((c) => c.assignments.some((a) => a.id === pendingAssignmentId))?.name ?? ''
            : ''}
          children={[pinModalChild]}
          onConfirm={handleConfirm}
          onClose={() => setPendingAssignmentId(null)}
        />
      )}

      {completed > 0 && approved < total && (
        <p className="text-xs text-blue-400/70 text-center">
          {completed} waiting for parent approval
        </p>
      )}
    </div>
  );
}
