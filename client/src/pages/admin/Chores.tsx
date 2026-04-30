import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, SkipForward, ChevronLeft, ChevronRight, Pencil, Check } from 'lucide-react';
import api from '../../lib/api';
import clsx from 'clsx';

interface Child {
  id: number;
  name: string;
  avatarEmoji: string;
  baseAllowance: number;
}

interface Assignment {
  id: number;
  childId: number;
  approvedAt: string | null;
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

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function getWeekDates(weekStart: Date) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * 86400000);
    return d;
  });
}

function getWeekStart(offset = 0): Date {
  const today = new Date();
  const dow = today.getUTCDay();
  const base = new Date(today.getTime() - dow * 86400000 + offset * 7 * 86400000);
  return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()));
}

function PenaltyPreview({
  child,
  chores,
}: {
  child: Child;
  chores: Chore[];
}) {
  const myAssignments = chores.flatMap((c) =>
    c.assignments.filter((a) => a.childId === child.id)
  );
  const penalty = myAssignments
    .filter((a) => !a.approvedAt)
    .reduce((sum, a) => {
      const chore = chores.find((c) => c.assignments.includes(a));
      return sum + (chore?.penaltyValue ?? 0);
    }, 0);
  const projected = Math.max(0, child.baseAllowance - penalty);

  return (
    <div className="text-xs text-slate-400 mt-1">
      Projected: <span className="text-indigo-300 font-medium">{projected} pts</span>
      {penalty > 0 && <span className="text-red-400 ml-1">(-{penalty})</span>}
    </div>
  );
}

function EditPenaltyModal({
  chore,
  onSave,
  onClose,
}: {
  chore: Chore;
  onSave: (penaltyValue: number) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(String(chore.penaltyValue));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-slate-800 rounded-xl p-5 w-72 border border-slate-700">
        <h3 className="font-semibold mb-3">Edit penalty — {chore.name}</h3>
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white mb-4 focus:outline-none focus:border-indigo-500"
        />
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-slate-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={() => { onSave(Number(value)); onClose(); }}
            className="px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Chores() {
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingChore, setEditingChore] = useState<Chore | null>(null);

  const weekStart = getWeekStart(weekOffset);
  const weekStartKey = formatDateKey(weekStart);
  const weekDates = getWeekDates(weekStart);

  const { data: chores = [], isLoading } = useQuery<Chore[]>({
    queryKey: ['chores', weekStartKey],
    queryFn: () => api.get('/chores', { params: { weekStart: weekStartKey } }).then((r) => r.data),
  });

  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ['children-admin'],
    queryFn: () => api.get('/children').then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: ({ choreId, childId }: { choreId: number; childId?: number }) =>
      api.patch(`/chores/${choreId}/approve`, childId ? { childId } : {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chores', weekStartKey] }),
  });

  const skipMutation = useMutation({
    mutationFn: (choreId: number) => api.patch(`/chores/${choreId}/skip`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chores', weekStartKey] }),
  });

  const updatePenaltyMutation = useMutation({
    mutationFn: ({ choreId, penaltyValue }: { choreId: number; penaltyValue: number }) =>
      api.patch(`/chores/${choreId}`, { penaltyValue }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chores', weekStartKey] }),
  });

  const sharedChores = chores.filter((c) => c.isShared);
  const individualChores = chores.filter((c) => !c.isShared);

  if (isLoading) return <div className="p-6 text-slate-400">Loading…</div>;

  return (
    <div className="p-6">
      {editingChore && (
        <EditPenaltyModal
          chore={editingChore}
          onSave={(v) => updatePenaltyMutation.mutate({ choreId: editingChore.id, penaltyValue: v })}
          onClose={() => setEditingChore(null)}
        />
      )}

      {/* Week nav */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Chores</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOffset((n) => n - 1)} className="p-2 text-slate-400 hover:text-white">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm text-slate-300 w-36 text-center">
            Week of {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
            {' – '}
            {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
          </span>
          <button onClick={() => setWeekOffset((n) => n + 1)} className="p-2 text-slate-400 hover:text-white">
            <ChevronRight size={18} />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} className="text-xs text-indigo-400 hover:text-indigo-300">
              This week
            </button>
          )}
        </div>
      </div>

      {/* Shared chores */}
      {sharedChores.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Shared Chores
          </h2>
          <div className="space-y-2">
            {sharedChores.map((chore) => (
              <div
                key={chore.id}
                className={clsx(
                  'flex items-center gap-3 rounded-xl p-3 border',
                  chore.status === 'COMPLETE'
                    ? 'bg-green-900/20 border-green-800/40'
                    : chore.status === 'SKIPPED'
                    ? 'bg-slate-800/40 border-slate-700/40'
                    : 'bg-slate-800 border-slate-700'
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{chore.name}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(chore.dueDate).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}
                    </span>
                    <span className="text-xs text-slate-500">penalty: {chore.penaltyValue} pts</span>
                    <button onClick={() => setEditingChore(chore)} className="text-slate-500 hover:text-slate-300">
                      <Pencil size={12} />
                    </button>
                  </div>
                  <div className="flex gap-1 mt-1">
                    {chore.assignments.map((a) => (
                      <span key={a.id} className="text-lg" title={a.child.name}>{a.child.avatarEmoji}</span>
                    ))}
                  </div>
                </div>
                {chore.status === 'OPEN' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveMutation.mutate({ choreId: chore.id })}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-700 hover:bg-green-600 rounded-lg text-sm"
                    >
                      <Check size={14} />
                      Approve all
                    </button>
                    <button
                      onClick={() => skipMutation.mutate(chore.id)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-400"
                    >
                      Skip
                    </button>
                  </div>
                )}
                {chore.status === 'COMPLETE' && (
                  <CheckCircle2 size={20} className="text-green-400" />
                )}
                {chore.status === 'SKIPPED' && (
                  <SkipForward size={20} className="text-slate-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-child columns */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${children.length}, minmax(0, 1fr))` }}
      >
        {children.map((child) => {
          const myChores = individualChores.filter((c) =>
            c.assignments.some((a) => a.childId === child.id)
          );

          return (
            <div key={child.id}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{child.avatarEmoji}</span>
                <span className="font-semibold">{child.name}</span>
              </div>
              <PenaltyPreview child={child} chores={myChores} />

              <div className="mt-3 space-y-2">
                {weekDates.map((date) => {
                  const dateKey = formatDateKey(date);
                  const dayChores = myChores.filter(
                    (c) => formatDateKey(new Date(c.dueDate)) === dateKey
                  );
                  if (dayChores.length === 0) return null;

                  return (
                    <div key={dateKey}>
                      <p className="text-xs text-slate-500 mb-1">
                        {DAY_LABELS[date.getUTCDay()]} {date.getUTCDate()}
                      </p>
                      {dayChores.map((chore) => {
                        const assignment = chore.assignments.find((a) => a.childId === child.id);
                        const approved = !!assignment?.approvedAt;
                        return (
                          <div
                            key={chore.id}
                            className={clsx(
                              'flex items-center gap-2 rounded-lg px-3 py-2 text-sm mb-1 border',
                              approved
                                ? 'bg-green-900/20 border-green-800/40 text-green-300'
                                : chore.status === 'SKIPPED'
                                ? 'bg-slate-800/40 border-slate-700/40 text-slate-500'
                                : 'bg-slate-800 border-slate-700'
                            )}
                          >
                            <span className="flex-1 truncate">{chore.name}</span>
                            <span className="text-xs text-slate-500">{chore.penaltyValue}pt</span>
                            <button
                              onClick={() => setEditingChore(chore)}
                              className="text-slate-500 hover:text-slate-300"
                            >
                              <Pencil size={10} />
                            </button>
                            {!approved && chore.status === 'OPEN' && (
                              <button
                                onClick={() => approveMutation.mutate({ choreId: chore.id, childId: child.id })}
                                className="text-slate-400 hover:text-green-400"
                                title="Approve"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            )}
                            {approved && <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {myChores.length === 0 && (
                  <p className="text-xs text-slate-600 italic">No chores this week</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
