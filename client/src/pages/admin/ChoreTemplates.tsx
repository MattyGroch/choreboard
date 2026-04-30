import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../../lib/api';

interface Child {
  id: number;
  name: string;
  avatarEmoji: string;
}

interface ChoreTemplate {
  id: number;
  name: string;
  description: string | null;
  penaltyValue: number;
  isRecurring: boolean;
  recurrenceDays: number[];
  isShared: boolean;
  assignedChildIds: number[];
  isActive: boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function TemplateForm({
  initial,
  children,
  onSave,
  onCancel,
}: {
  initial?: Partial<ChoreTemplate>;
  children: Child[];
  onSave: (data: Partial<ChoreTemplate>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [penaltyValue, setPenaltyValue] = useState(String(initial?.penaltyValue ?? 0));
  const isRecurring = initial?.isRecurring ?? true;
  const [recurrenceDays, setRecurrenceDays] = useState<number[]>(initial?.recurrenceDays ?? []);
  const [isShared, setIsShared] = useState(initial?.isShared ?? false);
  const [assignedChildIds, setAssignedChildIds] = useState<number[]>(initial?.assignedChildIds ?? []);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const toggleDay = (d: number) =>
    setRecurrenceDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const toggleChild = (id: number) =>
    setAssignedChildIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description: description || null,
      penaltyValue: Number(penaltyValue),
      isRecurring,
      recurrenceDays,
      isShared,
      assignedChildIds,
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{initial?.id ? 'Edit template' : 'New template'}</h3>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white"><X size={18} /></button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-slate-400 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-slate-400 mb-1">Description (optional)</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Penalty (pts)</label>
          <input type="number" min={0} value={penaltyValue} onChange={(e) => setPenaltyValue(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" required />
        </div>
        <div className="flex flex-col gap-2 justify-end">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isShared} onChange={(e) => setIsShared(e.target.checked)} className="accent-indigo-500" />
            Shared chore
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-indigo-500" />
            Active
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-2">Recurrence days</label>
        <div className="flex gap-2 flex-wrap">
          {DAY_LABELS.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                recurrenceDays.includes(i) ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-2">
          Assign to children <span className="text-slate-500">(empty = all children)</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleChild(c.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm transition-colors ${
                assignedChildIds.includes(c.id) ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              <span>{c.avatarEmoji}</span>
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium">Save</button>
      </div>
    </form>
  );
}

export default function ChoreTemplates() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  const { data: templates = [] } = useQuery<ChoreTemplate[]>({
    queryKey: ['chore-templates'],
    queryFn: () => api.get('/chore-templates').then((r) => r.data),
  });

  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ['children-admin'],
    queryFn: () => api.get('/children').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ChoreTemplate>) => api.post('/chore-templates', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chore-templates'] }); setEditing(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ChoreTemplate> }) =>
      api.patch(`/chore-templates/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['chore-templates'] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/chore-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chore-templates'] }),
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Chore Templates</h1>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          New template
        </button>
      </div>

      {editing === 'new' && (
        <div className="mb-4">
          <TemplateForm children={children} onSave={(d) => createMutation.mutate(d)} onCancel={() => setEditing(null)} />
        </div>
      )}

      <div className="space-y-3">
        {templates.map((t) =>
          editing === t.id ? (
            <TemplateForm
              key={t.id}
              initial={t}
              children={children}
              onSave={(d) => updateMutation.mutate({ id: t.id, data: d })}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div key={t.id} className="flex items-start gap-3 bg-slate-800 rounded-xl border border-slate-700 p-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t.name}</span>
                  {!t.isActive && <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">inactive</span>}
                  {t.isShared && <span className="text-xs bg-indigo-700/40 text-indigo-300 px-2 py-0.5 rounded-full">shared</span>}
                </div>
                <p className="text-sm text-slate-400 mt-0.5">
                  Penalty: {t.penaltyValue} pts ·{' '}
                  {t.recurrenceDays.map((d) => DAY_LABELS[d]).join(', ')} ·{' '}
                  {t.assignedChildIds.length === 0
                    ? 'All children'
                    : t.assignedChildIds
                        .map((id) => children.find((c) => c.id === id)?.name)
                        .filter(Boolean)
                        .join(', ')}
                </p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(t.id)} className="p-2 text-slate-400 hover:text-white"><Pencil size={15} /></button>
                <button
                  onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteMutation.mutate(t.id); }}
                  className="p-2 text-slate-400 hover:text-red-400"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
