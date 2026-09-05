import React, { useState } from 'react';
import { KeyRound, X, AlertCircle } from 'lucide-react';

interface DirectGuessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDirectGuess: (word: string) => Promise<{ correct: boolean; message: string }>;
}

export const DirectGuessModal: React.FC<DirectGuessModalProps> = ({
  isOpen,
  onClose,
  onDirectGuess,
}) => {
  const [guessWord, setGuessWord] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guessWord.trim() || isSubmitting) return;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md glass-panel-glow rounded-3xl p-6 shadow-2xl border border-indigo-500/30 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">Прямая угадайка</h3>
            <p className="text-xs text-slate-400">
              Вы можете попытаться назвать тайное слово ведущего целиком!
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="text"
            autoFocus
            value={guessWord}
            onChange={(e) => {
              setGuessWord(e.target.value);
              setFeedback(null);
            }}
            placeholder="Введите слово целиком..."
            className="w-full px-4 py-3 rounded-xl bg-slate-900 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold tracking-wide uppercase"
          />

          {feedback && (
            <div
              className={`text-xs p-2.5 rounded-lg flex items-center gap-2 ${
                feedback.isError
                  ? 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                  : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
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
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!guessWord.trim() || isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Назвать слово
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
