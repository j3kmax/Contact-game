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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-panel-glow rounded-3xl p-6 shadow-2xl border border-slate-800/90 bg-[#0d111c]/95 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white tracking-tight">Прямая угадайка</h3>
            <p className="text-xs text-slate-400">
              Вы можете попытаться назвать тайное слово ведущего целиком!
            </p>
          </div>
        </div>

        {isCooldownActive && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/25 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              У вас 1 попытка в 30 секунд. Перезарядка: <strong className="font-mono">{remainingSec} сек.</strong>
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
              setGuessWord(e.target.value);
              setFeedback(null);
            }}
            placeholder={isCooldownActive ? `Подождите ${remainingSec} сек...` : "Введите слово целиком..."}
            className="w-full px-4 py-3 rounded-xl bg-[#090b10] text-white placeholder-slate-600 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-bold tracking-wide uppercase disabled:opacity-50 font-mono"
          />

          {feedback && (
            <div
              className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
                feedback.isError
                  ? 'bg-rose-950/30 text-rose-300 border border-rose-800/40'
                  : 'bg-emerald-950/30 text-emerald-300 border border-emerald-800/40'
              }`}
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-sm font-semibold transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!guessWord.trim() || isSubmitting || isCooldownActive}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isCooldownActive ? `Ждите (${remainingSec}с)` : 'Назвать слово'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
