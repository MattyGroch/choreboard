import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../../lib/api';

interface Child {
  id: number;
  name: string;
  avatarEmoji: string;
  pin: string | null;
  pointBalance: number;
  weekStreak: number;
  baseAllowance: number;
}

const EMOJIS = ['🦁', '🐢', '🦊', '🐼', '🦄', '🐸', '🐻', '🦋', '🐯', '🦖', '🐙', '🦕'];

function ChildForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Child>;
  onSave: (data: Partial<Child>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [avatarEmoji, setAvatarEmoji] = useState(initial?.avatarEmoji ?? '🦁');
  const [pin, setPin] = useState(initial?.pin ?? '');
  const [baseAllowance, setBaseAllowance] = useState(String(initial?.baseAllowance ?? 50));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      avatarEmoji,
      pin: pin.length === 4 ? pin : null,
      baseAllowance: Number(baseAllowance),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{initial?.id ? 'Edit child' : 'Add child'}</h3>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-slate-400 mb-2">Avatar</label>
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setAvatarEmoji(e)}
              className={`text-2xl p-1.5 rounded-lg transition-colors ${avatarEmoji === e ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">PIN (4 digits, optional)</label>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="Leave blank for no PIN"
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Weekly allowance (pts)</label>
          <input
            type="number"
            min={0}
            value={baseAllowance}
            onChange={(e) => setBaseAllowance(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            required
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-400 hover:text-white">
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium"
        >
          Save
        </button>
      </div>
    </form>
  );
}

export default function Children() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ['children-admin'],
    queryFn: () => api.get('/children').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Child>) => api.post('/children', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['children-admin'] }); setEditing(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Child> }) =>
      api.patch(`/children/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['children-admin'] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/children/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['children-admin'] }),
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Children</h1>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          Add child
        </button>
      </div>

      {editing === 'new' && (
        <div className="mb-4">
          <ChildForm
            onSave={(data) => createMutation.mutate(data)}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="space-y-3">
        {children.map((child) =>
          editing === child.id ? (
            <ChildForm
              key={child.id}
              initial={child}
              onSave={(data) => updateMutation.mutate({ id: child.id, data })}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <div
              key={child.id}
              className="flex items-center gap-4 bg-slate-800 rounded-xl border border-slate-700 p-4"
            >
              <span className="text-3xl">{child.avatarEmoji}</span>
              <div className="flex-1">
                <p className="font-semibold">{child.name}</p>
                <p className="text-sm text-slate-400">
                  {child.baseAllowance} pts/week · {child.pin ? 'PIN set' : 'No PIN'} ·{' '}
                  {child.pointBalance} pts balance
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(child.id)}
                  className="p-2 text-slate-400 hover:text-white"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${child.name}? This cannot be undone.`)) {
                      deleteMutation.mutate(child.id);
                    }
                  }}
                  className="p-2 text-slate-400 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
