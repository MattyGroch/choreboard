import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, CheckCircle2, Pencil, X } from 'lucide-react';
import api from '../../lib/api';

interface BountyTemplate {
  id: number;
  name: string;
  description: string | null;
  pointValue: number;
  maxClaims: number | null;
  recurrence: 'NONE' | 'DAILY' | 'WEEKLY';
  recurrenceDayOfWeek: number | null;
  isActive: boolean;
}

interface Bounty {
  id: number;
  name: string;
  pointValue: number;
  maxClaims: number | null;
  expiresAt: string | null;
  activeClaims: number;
  slotsRemaining: number | null;
  claims: { id: number; childId: number; status: string }[];
}

interface Child {
  id: number;
  name: string;
  avatarEmoji: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function TemplateForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<BountyTemplate>;
  onSave: (d: Partial<BountyTemplate>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [pointValue, setPointValue] = useState(String(initial?.pointValue ?? 10));
  const [maxClaims, setMaxClaims] = useState(String(initial?.maxClaims ?? ''));
  const [recurrence, setRecurrence] = useState(initial?.recurrence ?? 'NONE');
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState(String(initial?.recurrenceDayOfWeek ?? ''));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name, description: description || null,
      pointValue: Number(pointValue),
      maxClaims: maxClaims ? Number(maxClaims) : null,
      recurrence,
      recurrenceDayOfWeek: recurrence === 'WEEKLY' && recurrenceDayOfWeek ? Number(recurrenceDayOfWeek) : null,
      isActive,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl border border-slate-700 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{initial?.id ? 'Edit template' : 'New bounty template'}</h3>
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
          <label className="block text-sm text-slate-400 mb-1">Points</label>
          <input type="number" min={1} value={pointValue} onChange={(e) => setPointValue(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" required />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Max claims (blank = unlimited)</label>
          <input type="number" min={1} value={maxClaims} onChange={(e) => setMaxClaims(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500" />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Recurrence</label>
          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value as 'NONE' | 'DAILY' | 'WEEKLY')}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500">
            <option value="NONE">One-off</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
          </select>
        </div>
        {recurrence === 'WEEKLY' && (
          <div>
            <label className="block text-sm text-slate-400 mb-1">Day of week</label>
            <select value={recurrenceDayOfWeek} onChange={(e) => setRecurrenceDayOfWeek(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500">
              {DAY_LABELS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
        )}
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-indigo-500" />
            Active
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

export default function Bounties() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'instances' | 'templates'>('instances');
  const [editingTemplate, setEditingTemplate] = useState<number | 'new' | null>(null);

  const { data: bounties = [] } = useQuery<Bounty[]>({
    queryKey: ['bounties'],
    queryFn: () => api.get('/bounties').then((r) => r.data),
  });

  const { data: templates = [] } = useQuery<BountyTemplate[]>({
    queryKey: ['bounty-templates'],
    queryFn: () => api.get('/bounty-templates').then((r) => r.data),
  });

  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ['children-admin'],
    queryFn: () => api.get('/children').then((r) => r.data),
  });

  const approveClaim = useMutation({
    mutationFn: (claimId: number) => api.patch(`/bounty-claims/${claimId}/approve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bounties'] }),
  });

  const deleteBounty = useMutation({
    mutationFn: (id: number) => api.delete(`/bounties/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bounties'] }),
  });

  const createTemplate = useMutation({
    mutationFn: (d: Partial<BountyTemplate>) => api.post('/bounty-templates', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bounty-templates'] }); setEditingTemplate(null); },
  });

  const updateTemplate = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Partial<BountyTemplate> }) => api.patch(`/bounty-templates/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bounty-templates'] }); setEditingTemplate(null); },
  });

  const deleteTemplate = useMutation({
    mutationFn: (id: number) => api.delete(`/bounty-templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bounty-templates'] }),
  });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Bounties</h1>

      <div className="flex gap-2 mb-6">
        {(['instances', 'templates'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
          >
            {t === 'instances' ? 'Active Bounties' : 'Templates'}
          </button>
        ))}
      </div>

      {tab === 'instances' && (
        <div className="space-y-3">
          {bounties.length === 0 && <p className="text-slate-500 text-sm">No active bounties.</p>}
          {bounties.map((b) => (
            <div key={b.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{b.name}</p>
                  <p className="text-sm text-slate-400">
                    {b.pointValue} pts · {b.activeClaims}/{b.maxClaims ?? '∞'} claimed
                    {b.expiresAt && ` · expires ${new Date(b.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button onClick={() => deleteBounty.mutate(b.id)} className="text-slate-500 hover:text-red-400">
                  <Trash2 size={15} />
                </button>
              </div>

              {b.claims.length > 0 && (
                <div className="mt-3 space-y-1">
                  {b.claims.map((claim) => {
                    const child = children.find((c) => c.id === claim.childId);
                    return (
                      <div key={claim.id} className="flex items-center gap-2 text-sm">
                        <span>{child?.avatarEmoji}</span>
                        <span>{child?.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          claim.status === 'APPROVED' ? 'bg-green-700/40 text-green-300' :
                          claim.status === 'COMPLETE' ? 'bg-blue-700/40 text-blue-300' :
                          'bg-slate-700 text-slate-400'
                        }`}>{claim.status}</span>
                        {(claim.status === 'CLAIMED' || claim.status === 'COMPLETE') && (
                          <button
                            onClick={() => approveClaim.mutate(claim.id)}
                            className="ml-auto flex items-center gap-1 text-xs px-2 py-1 bg-green-700 hover:bg-green-600 rounded-lg"
                          >
                            <CheckCircle2 size={12} />
                            Approve
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'templates' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setEditingTemplate('new')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium"
            >
              <Plus size={16} />
              New template
            </button>
          </div>

          {editingTemplate === 'new' && (
            <div className="mb-4">
              <TemplateForm onSave={(d) => createTemplate.mutate(d)} onCancel={() => setEditingTemplate(null)} />
            </div>
          )}

          <div className="space-y-3">
            {templates.map((t) =>
              editingTemplate === t.id ? (
                <TemplateForm
                  key={t.id}
                  initial={t}
                  onSave={(d) => updateTemplate.mutate({ id: t.id, d })}
                  onCancel={() => setEditingTemplate(null)}
                />
              ) : (
                <div key={t.id} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl p-4">
                  <div className="flex-1">
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-sm text-slate-400">
                      {t.pointValue} pts · {t.recurrence === 'NONE' ? 'One-off' : t.recurrence === 'DAILY' ? 'Daily' : `Weekly (${DAY_LABELS[t.recurrenceDayOfWeek ?? 0]})`}
                      {t.maxClaims ? ` · max ${t.maxClaims}` : ' · unlimited'}
                      {!t.isActive && ' · inactive'}
                    </p>
                  </div>
                  <button onClick={() => setEditingTemplate(t.id)} className="p-2 text-slate-400 hover:text-white"><Pencil size={15} /></button>
                  <button onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteTemplate.mutate(t.id); }} className="p-2 text-slate-400 hover:text-red-400"><Trash2 size={15} /></button>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
