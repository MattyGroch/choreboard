import { useState } from 'react';
import { Gift } from 'lucide-react';
import api from '../../lib/api';
import PinModal from './PinModal';

interface Child {
  id: number;
  name: string;
  avatarEmoji: string;
  pointBalance: number;
  pin?: string | null;
}

interface Prize {
  id: number;
  name: string;
  description: string | null;
  pointCost: number;
  imageUrl: string | null;
}

interface Props {
  prizes: Prize[];
  children: Child[];
  onRequested: () => void;
}

export default function PrizeShop({ prizes, children, onRequested }: Props) {
  const [activePrize, setActivePrize] = useState<Prize | null>(null);

  if (prizes.length === 0) return null;

  const handleRequest = async (childId: number, pin?: string) => {
    await api.post('/prize-requests', { prizeId: activePrize!.id, childId, pin });
    onRequested();
  };

  return (
    <section>
      <h2 className="text-lg font-bold text-slate-300 mb-3 flex items-center gap-2">
        <Gift size={18} className="text-pink-400" />
        Prize Shop
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {prizes.map((p) => (
          <button
            key={p.id}
            onClick={() => setActivePrize(p)}
            className="bg-pink-900/30 border border-pink-700/40 hover:border-pink-500/60 hover:bg-pink-900/50 rounded-xl p-4 text-left transition-all active:scale-95"
          >
            {p.imageUrl && (
              <img
                src={p.imageUrl}
                alt={p.name}
                className="w-full h-20 object-cover rounded-lg mb-2"
              />
            )}
            <p className="font-semibold text-pink-100 leading-tight">{p.name}</p>
            {p.description && (
              <p className="text-xs text-pink-300/60 mt-1 line-clamp-2">{p.description}</p>
            )}
            <p className="text-xl font-bold text-pink-400 mt-2">{p.pointCost} pts</p>
          </button>
        ))}
      </div>

      {activePrize && (
        <PinModal
          title={activePrize.name}
          subtitle={`Costs ${activePrize.pointCost} points`}
          children={children}
          onConfirm={handleRequest}
          onClose={() => setActivePrize(null)}
        />
      )}
    </section>
  );
}
