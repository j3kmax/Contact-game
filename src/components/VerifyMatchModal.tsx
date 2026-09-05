import React, { useState } from 'react';
import { CheckCircle2, Lock, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { Room, Player } from '../types/game';

interface VerifyMatchModalProps {
  room: Room;
  currentUser: Player;
  onSubmitMatchWord: (word: string) => Promise<void>;
}

export const VerifyMatchModal: React.FC<VerifyMatchModalProps> = ({
  room,
  currentUser,
  onSubmitMatchWord,
}) => {
  const authorId = room.currentQuestion?.authorId;
  const authorName = room.currentQuestion?.authorName || 'Автор';
  const partnerId = room.contactData?.partnerId;
  const partnerName = room.contactData?.partnerName || 'Партнер';

  const isAuthor = currentUser.id === authorId;
  const isPartner = currentUser.id === partnerId;
  const isParticipant = isAuthor || isPartner;

  const [word, setWord] = useState(() => {
    if (currentUser.id === room.currentQuestion?.authorId && room.currentQuestion?.intendedWord) {
      return room.currentQuestion.intendedWord;
    }
    return '';
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasUserSubmitted = !!room.submissions?.[currentUser.id];
  const authorSubmitted = !!(authorId && room.submissions?.[authorId]);
  const partnerSubmitted = !!(partnerId && room.submissions?.[partnerId]);

  const revealedPrefix = room.secretWord.slice(0, room.revealedLettersCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || isSubmitting) return;

    setError(null);
    try {
      setIsSubmitting(true);
      await onSubmitMatchWord(word);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка при отправке слова');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-panel-glow rounded-3xl p-6 sm:p-8 shadow-2xl border border-indigo-500/40 relative overflow-hidden">
        {/* Decorative Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Сверка ассоциаций
          </h2>
          <p className="text-sm text-slate-300 mt-1">
            Намёк: <span className="font-semibold text-white">«{room.currentQuestion?.text}»</span>
          </p>
        </div>

        {/* Status of both participants */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div
            className={`p-3 rounded-2xl border text-center transition-all ${
              authorSubmitted
                ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="text-xs font-semibold uppercase">{authorName} (Автор)</div>
            <div className="text-sm font-bold flex items-center justify-center gap-1.5 mt-1">
              {authorSubmitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Слово введено</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                  <span>Думает...</span>
                </>
              )}
            </div>
          </div>

          <div
            className={`p-3 rounded-2xl border text-center transition-all ${
              partnerSubmitted
                ? 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-400'
            }`}
          >
            <div className="text-xs font-semibold uppercase">{partnerName} (Контакт)</div>
            <div className="text-sm font-bold flex items-center justify-center gap-1.5 mt-1">
              {partnerSubmitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Слово введено</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                  <span>Думает...</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Input Form for Author or Partner */}
        {isParticipant ? (
          hasUserSubmitted ? (
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-600/30 text-center">
              <Sparkles className="w-6 h-6 text-indigo-400 mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-semibold text-indigo-200">
                Вы подтвердили слово: «{room.submissions[currentUser.id]?.toUpperCase()}»
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Ожидаем подтверждения от второго игрока...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Какое слово вы имели в виду? (начинается на <span className="text-indigo-400 font-bold">{revealedPrefix}...</span>)
                </label>
                <input
                  type="text"
                  autoFocus
                  value={word}
                  onChange={(e) => {
                    setWord(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder={`Слово на букву ${revealedPrefix.toUpperCase()}...`}
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-900 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-lg uppercase font-mono"
                />
              </div>

              {error && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={!word.trim() || isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-base shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <span>Подтвердить слово</span>
              </button>
            </form>
          )
        ) : (
          /* Spectator / Host view */
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
            <h4 className="text-base font-semibold text-white">
              Идет секретный ввод слов...
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Если слова автора и партнера совпадут, ведущему придется открыть следующую букву!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
