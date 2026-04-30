import { useState, useEffect } from 'react';
import { X, Delete } from 'lucide-react';
import clsx from 'clsx';

interface Child {
  id: number;
  name: string;
  avatarEmoji: string;
  pointBalance: number;
  pin?: string | null;
}

interface Props {
  title: string;
  subtitle?: string;
  children: Child[];
  onConfirm: (childId: number, pin?: string) => Promise<void>;
  onClose: () => void;
}

export default function PinModal({ title, subtitle, children, onConfirm, onClose }: Props) {
  const single = children.length === 1 ? children[0] : null;
  const [step, setStep] = useState<'select' | 'pin'>(
    single?.pin != null ? 'pin' : 'select'
  );
  const [selected, setSelected] = useState<Child | null>(single ?? null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const needsPin = selected?.pin != null;

  // Single child with no PIN — auto-submit immediately
  useEffect(() => {
    if (single && single.pin == null) {
      handleSubmit(single, undefined);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectChild = (child: Child) => {
    setSelected(child);
    setPin('');
    setError('');
    if (child.pin != null) {
      setStep('pin');
    } else {
      handleSubmit(child, undefined);
    }
  };

  const handleKeypad = (digit: string) => {
    if (pin.length < 4) setPin((p) => p + digit);
  };

  const handleDelete = () => setPin((p) => p.slice(0, -1));

  const handleSubmit = async (child: Child, enteredPin?: string) => {
    setLoading(true);
    setError('');
    try {
      await onConfirm(child.id, enteredPin);
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
    if (!selected || pin.length !== 4) return;
    handleSubmit(selected, pin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-1">{title}</h2>
        {subtitle && <p className="text-sm text-slate-400 mb-4">{subtitle}</p>}

        {step === 'select' && (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => handleSelectChild(child)}
                className="flex flex-col items-center gap-2 p-4 bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors"
              >
                <span className="text-4xl">{child.avatarEmoji}</span>
                <span className="font-semibold">{child.name}</span>
                <span className="text-xs text-indigo-400">{child.pointBalance} pts</span>
              </button>
            ))}
          </div>
        )}

        {step === 'pin' && selected && needsPin && (
          <div className="mt-4">
            <p className="text-center text-slate-300 mb-1">
              Enter PIN for <span className="font-bold">{selected.name}</span>
            </p>

            {/* PIN dots */}
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

            {error && (
              <p className="text-center text-red-400 text-sm mb-3">{error}</p>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleKeypad(d)}
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
                onClick={() => handleKeypad('0')}
                className="bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded-xl py-4 text-xl font-bold transition-colors"
              >
                0
              </button>
              <button
                onClick={handleDelete}
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
