import { useState } from 'react';
import { Star } from 'lucide-react';
import api from '../../lib/api';
import PinModal from './PinModal';

interface Child {
  id: number;
  name: string;
  avatarEmoji: string;
  pointBalance: number;
  pin?: string | null;
}

interface Bounty {
  id: number;
  name: string;
  description: string | null;
  pointValue: number;
  maxClaims: number | null;
  activeClaims: number;
  slotsRemaining: number | null;
}

interface Props {
  bounties: Bounty[];
  children: Child[];
  onClaimed: () => void;
}

export default function BountyBoard({ bounties, children, onClaimed }: Props) {
  const [activeBounty, setActiveBounty] = useState<Bounty | null>(null);

  if (bounties.length === 0) return null;

  const handleClaim = async (childId: number, pin?: string) => {
    await api.post('/bounty-claims', { bountyId: activeBounty!.id, childId, pin });
    onClaimed();
  };

  return (
    <section>
      <h2 className="text-lg font-bold text-slate-300 mb-3 flex items-center gap-2">
        <Star size={18} className="text-amber-400" />
        Bounty Board
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {bounties.map((b) => (
          <button
            key={b.id}
            onClick={() => setActiveBounty(b)}
            className="bg-amber-900/30 border border-amber-700/40 hover:border-amber-500/60 hover:bg-amber-900/50 rounded-xl p-4 text-left transition-all active:scale-95"
          >
            <p className="font-semibold text-amber-100 leading-tight">{b.name}</p>
            {b.description && (
              <p className="text-xs text-amber-300/60 mt-1 line-clamp-2">{b.description}</p>
            )}
            <p className="text-xl font-bold text-amber-400 mt-2">{b.pointValue} pts</p>
            {b.maxClaims !== null && (
              <p className="text-xs text-amber-300/60 mt-1">
                {b.activeClaims}/{b.maxClaims} claimed
              </p>
            )}
          </button>
        ))}
      </div>

      {activeBounty && (
        <PinModal
          title={activeBounty.name}
          subtitle={`Earn ${activeBounty.pointValue} points`}
          children={children}
          onConfirm={handleClaim}
          onClose={() => setActiveBounty(null)}
        />
      )}
    </section>
  );
}
