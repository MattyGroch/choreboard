import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import api from '../../lib/api';

interface Prize {
  id: number;
  name: string;
  description: string | null;
  pointCost: number;
  imageUrl: string | null;
  isActive: boolean;
}

function PrizeForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Prize>;
  onSave: (d: Partial<Prize>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [pointCost, setPointCost] = useState(String(initial?.pointCost ?? 10));
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      description: description || null,
      pointCost: Number(pointCost),
      imageUrl: imageUrl || null,
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{initial?.id ? 'Edit prize' : 'New prize'}</h3>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-white"><X size={18} /></button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-slate-400 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-slate-400 mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Point cost</label>
          <input type="number" min={1} value={pointCost} onChange={(e) => setPointCost(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" required />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Image URL (optional)</label>
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-indigo-500" />
            Active (visible in prize shop)
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-slate-400 hover:text-white">Cancel</button>
        <button type="submit" className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium">Save</button>
      </div>
    </form>
  );
}

export default function Prizes() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<number | 'new' | null>(null);

  const { data: prizes = [] } = useQuery<Prize[]>({
    queryKey: ['prizes-admin'],
    queryFn: () => api.get('/prizes').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (d: Partial<Prize>) => api.post('/prizes', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prizes-admin'] }); setEditing(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Partial<Prize> }) => api.patch(`/prizes/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prizes-admin'] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/prizes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prizes-admin'] }),
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Prize Shop</h1>
        <button
          onClick={() => setEditing('new')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium"
        >
          <Plus size={16} />
          New prize
        </button>
      </div>

      {editing === 'new' && (
        <div className="mb-4">
          <PrizeForm onSave={(d) => createMutation.mutate(d)} onCancel={() => setEditing(null)} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {prizes.map((p) =>
          editing === p.id ? (
            <div key={p.id} className="col-span-full">
              <PrizeForm
                initial={p}
                onSave={(d) => updateMutation.mutate({ id: p.id, d })}
                onCancel={() => setEditing(null)}
              />
            </div>
          ) : (
            <div key={p.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex flex-col gap-2">
              {p.imageUrl && (
                <img src={p.imageUrl} alt={p.name} className="w-full h-32 object-cover rounded-lg" />
              )}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  {p.description && <p className="text-sm text-slate-400">{p.description}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(p.id)} className="p-1.5 text-slate-400 hover:text-white"><Pencil size={14} /></button>
                  <button onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id); }} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-pink-400">{p.pointCost} pts</span>
                {!p.isActive && <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">inactive</span>}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
