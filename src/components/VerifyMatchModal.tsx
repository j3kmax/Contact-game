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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-panel-elevated rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(244,63,94,0.3),0_20px_50px_rgba(0,0,0,0.85)] border border-rose-500/40 relative overflow-hidden specular-border">
        {/* Sleek Top Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400" />

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500/25 to-amber-500/25 border border-rose-400/50 text-rose-300 mb-3 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
            <Lock className="w-5 h-5 drop-shadow-[0_0_6px_#f43f5e]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Сверка ассоциаций
          </h2>
          <p className="text-xs sm:text-sm text-zinc-300 mt-1">
            Намёк: <span className="font-semibold text-rose-300">«{room.currentQuestion?.text}»</span>
          </p>
        </div>

        {/* Status of both participants */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div
            className={`p-3 rounded-2xl border text-center transition-all ${
              authorSubmitted
                ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-300'
                : 'bg-[#140624]/90 border-white/[0.08] text-zinc-400'
            }`}
          >
            <div className="text-[11px] font-semibold uppercase text-zinc-400">{authorName} (Автор)</div>
            <div className="text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 mt-1">
              {authorSubmitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Слово введено</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                  <span>Думает...</span>
                </>
              )}
            </div>
          </div>

          <div
            className={`p-3 rounded-2xl border text-center transition-all ${
              partnerSubmitted
                ? 'bg-emerald-950/25 border-emerald-500/40 text-emerald-300'
                : 'bg-[#140624]/90 border-white/[0.08] text-zinc-400'
            }`}
          >
            <div className="text-[11px] font-semibold uppercase text-zinc-400">{partnerName} (Контакт)</div>
            <div className="text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 mt-1">
              {partnerSubmitted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Слово введено</span>
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                  <span>Думает...</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Input Form for Author or Partner */}
        {isParticipant ? (
          hasUserSubmitted ? (
            <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-center">
              <Sparkles className="w-5 h-5 text-rose-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-rose-200">
                Вы подтвердили слово: «{room.submissions[currentUser.id]?.toUpperCase()}»
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Ожидаем подтверждения от второго игрока...
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Какое слово вы имели в виду? (начинается на <span className="text-amber-400 font-bold font-mono">{revealedPrefix}...</span>)
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
                  className="w-full px-4 py-3 rounded-2xl bg-[#140624] text-white placeholder-zinc-600 border border-white/[0.1] focus:outline-none focus:ring-1 focus:ring-rose-400 focus:border-rose-400 font-semibold text-base uppercase font-mono shadow-inner"
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
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400 hover:from-rose-400 hover:to-amber-300 text-slate-950 font-black text-sm shadow-lg shadow-rose-950/40 border border-rose-300/40 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer active:scale-95"
              >
                <span>Подтвердить слово</span>
              </button>
            </form>
          )
        ) : (
          /* Spectator / Host view */
          <div className="p-6 rounded-2xl bg-[#140624]/80 border border-white/[0.08] text-center">
            <Loader2 className="w-7 h-7 text-amber-400 animate-spin mx-auto mb-3" />
            <h4 className="text-sm sm:text-base font-semibold text-white">
              Идет секретный ввод слов...
            </h4>
            <p className="text-xs text-zinc-400 mt-1">
              Если слова автора и партнера совпадут, ведущему придется открыть следующую букву!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
