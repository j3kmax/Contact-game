import React, { useState, useEffect } from 'react';
import { KeyRound, X, AlertCircle, Clock } from 'lucide-react';

interface DirectGuessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDirectGuess: (word: string) => Promise<{ correct: boolean; message: string }>;
  cooldownUntil?: number;
}

export const DirectGuessModal: React.FC<DirectGuessModalProps> = ({
  isOpen,
  onClose,
  onDirectGuess,
  cooldownUntil = 0,
}) => {
  const [guessWord, setGuessWord] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number>(0);

  useEffect(() => {
    if (!isOpen) return;

    const checkCooldown = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
      setRemainingSec(diff);
    };

    checkCooldown();
    const timer = setInterval(checkCooldown, 1000);
    return () => clearInterval(timer);
  }, [isOpen, cooldownUntil]);

  if (!isOpen) return null;

  const isCooldownActive = remainingSec > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessWord.trim() || isSubmitting || isCooldownActive) return;

    setFeedback(null);
    try {
      setIsSubmitting(true);
      const res = await onDirectGuess(guessWord);
      if (res.correct) {
        onClose();
      } else {
        setFeedback({ message: res.message, isError: true });
      }
    } catch {
      setFeedback({ message: 'Ошибка при отправке догадки', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-md glass-panel-elevated rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(16,185,129,0.3),0_20px_50px_rgba(0,0,0,0.85)] border border-emerald-500/40 relative overflow-hidden specular-border">
        {/* Ambient emerald flare */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/20 blur-3xl pointer-events-none rounded-full" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500/25 to-lime-500/25 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)] shrink-0">
            <KeyRound className="w-5 h-5 drop-shadow-[0_0_6px_#10b981]" />
          </div>
          <div>
            <h3 className="font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-lime-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]">
              Прямая отгадка
            </h3>
            <p className="text-xs text-zinc-300">
              Попробуйте назвать всё секретное слово целиком (+25 баллов)!
            </p>
          </div>
        </div>

        {isCooldownActive && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-950/40 border border-amber-400/50 text-amber-200 text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.2)] font-medium">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              1 попытка в 30 секунд. Перезарядка: <strong className="font-mono text-amber-300">{remainingSec} сек.</strong>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            autoFocus
            disabled={isCooldownActive}
            value={guessWord}
            onChange={(e) => {
              setGuessWord(e.target.value.toUpperCase());
              setFeedback(null);
            }}
            placeholder={isCooldownActive ? `Подождите ${remainingSec} сек...` : "ВВЕДИТЕ СЛОВО ЦЕЛИКОМ..."}
            className="w-full px-4 py-3.5 rounded-2xl bg-[#061e14] text-emerald-200 placeholder-zinc-600 border border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 font-black tracking-widest uppercase disabled:opacity-40 font-mono text-base shadow-[0_0_15px_rgba(16,185,129,0.15)]"
          />

          {feedback && (
            <div
              className={`text-xs p-3 rounded-2xl flex items-center gap-2 font-medium ${
                feedback.isError
                  ? 'bg-rose-950/40 text-rose-300 border border-rose-800/50'
                  : 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[#061e14] hover:bg-zinc-800 border border-white/[0.1] text-zinc-300 hover:text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!guessWord.trim() || isSubmitting || isCooldownActive}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 text-slate-950 text-sm font-black shadow-[0_0_25px_rgba(16,185,129,0.4)] border border-emerald-300/60 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
            >
              {isCooldownActive ? `Ждите (${remainingSec}с)` : 'Назвать слово'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
