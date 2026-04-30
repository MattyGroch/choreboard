import { useState } from 'react';
import { Star, X, Delete } from 'lucide-react';
import clsx from 'clsx';
import api from '../../lib/api';

interface Child {
  id: number;
  name: string;
  avatarEmoji: string;
  pointBalance: number;
  hasPin: boolean;
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

interface ClaimModalProps {
  bounty: Bounty;
  children: Child[];
  onClose: () => void;
  onClaimed: () => void;
}

function ClaimModal({ bounty, children, onClose, onClaimed }: ClaimModalProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const [step, setStep] = useState<'select' | 'pin'>('select');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleChild = (id: number) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const singleSelectedChild = selected.length === 1 ? children.find((c) => c.id === selected[0]) : null;
  const needsPin = singleSelectedChild?.hasPin === true;

  const handleNext = () => {
    if (selected.length === 0) return;
    if (needsPin) {
      setStep('pin');
    } else {
      submit(undefined);
    }
  };

  const submit = async (enteredPin?: string) => {
    setLoading(true);
    setError('');
    try {
      await Promise.all(
        selected.map((childId) =>
          api.post('/bounty-claims', { bountyId: bounty.id, childId, pin: enteredPin })
        )
      );
      onClaimed();
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? err.message
          : 'Something went wrong';
      setError(msg);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const submitPin = () => {
    if (pin.length !== 4) return;
    submit(pin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-1">{bounty.name}</h2>
        <p className="text-sm text-slate-400 mb-4">Earn {bounty.pointValue} pts each</p>

        {step === 'select' && (
          <>
            <p className="text-sm text-slate-400 mb-3">Who completed this bounty?</p>
            <div className="grid grid-cols-2 gap-3">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => toggleChild(child.id)}
                  className={clsx(
                    'flex flex-col items-center gap-2 p-4 rounded-xl transition-colors border-2',
                    selected.includes(child.id)
                      ? 'bg-indigo-600/30 border-indigo-500 text-white'
                      : 'bg-slate-700 border-transparent text-slate-300 hover:bg-slate-600'
                  )}
                >
                  <span className="text-4xl">{child.avatarEmoji}</span>
                  <span className="font-semibold">{child.name}</span>
                  <span className="text-xs text-indigo-400">{child.pointBalance} pts</span>
                </button>
              ))}
            </div>

            {error && <p className="text-center text-red-400 text-sm mt-3">{error}</p>}

            <button
              onClick={handleNext}
              disabled={selected.length === 0 || loading}
              className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl font-semibold transition-colors"
            >
              {loading
                ? 'Claiming…'
                : selected.length === 0
                ? 'Select who completed it'
                : `Claim for ${selected.length} child${selected.length > 1 ? 'ren' : ''}`}
            </button>
          </>
        )}

        {step === 'pin' && singleSelectedChild && (
          <div>
            <p className="text-center text-slate-300 mb-1">
              Enter PIN for <span className="font-bold">{singleSelectedChild.name}</span>
            </p>

            <div className="flex justify-center gap-3 my-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={clsx(
                    'w-4 h-4 rounded-full border-2 transition-colors',
                    i < pin.length ? 'bg-indigo-400 border-indigo-400' : 'border-slate-500'
                  )}
                />
              ))}
            </div>

            {error && <p className="text-center text-red-400 text-sm mb-3">{error}</p>}

            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  onClick={() => pin.length < 4 && setPin((p) => p + d)}
                  className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-xl py-4 text-xl font-bold transition-colors"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => { setStep('select'); setPin(''); setError(''); }}
                className="bg-slate-700 hover:bg-slate-600 rounded-xl py-4 text-sm text-slate-400 transition-colors"
              >
                Back
              </button>
              <button
                onClick={() => pin.length < 4 && setPin((p) => p + '0')}
                className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-xl py-4 text-xl font-bold transition-colors"
              >
                0
              </button>
              <button
                onClick={() => setPin((p) => p.slice(0, -1))}
                className="bg-slate-700 hover:bg-slate-600 rounded-xl py-4 flex items-center justify-center transition-colors"
              >
                <Delete size={20} className="text-slate-400" />
              </button>
            </div>

            <button
              onClick={submitPin}
              disabled={pin.length !== 4 || loading}
              className="mt-4 w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-xl font-semibold transition-colors"
            >
              {loading ? 'Confirming…' : 'Confirm'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BountyBoard({ bounties, children, onClaimed }: Props) {
  const [activeBounty, setActiveBounty] = useState<Bounty | null>(null);

  if (bounties.length === 0) return null;

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
        <ClaimModal
          bounty={activeBounty}
          children={children}
          onClaimed={onClaimed}
          onClose={() => setActiveBounty(null)}
        />
      )}
    </section>
  );
}
