import React, { useState } from 'react';
import { Send, Shield, Zap, XCircle, KeyRound, HelpCircle, AlertCircle } from 'lucide-react';
import { Room, Player } from '../types/game';
import { Timer } from './Timer';

interface ActionPanelProps {
  room: Room;
  currentUser: Player;
  onAskQuestion: (text: string) => Promise<void>;
  onCancelQuestion: () => Promise<void>;
  onDeclareContact: () => Promise<void>;
  onDeflect: (word: string) => Promise<{ success: boolean; error?: string }>;
  onTimerExpired: () => void;
  onOpenDirectGuess: () => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  room,
  currentUser,
  onAskQuestion,
  onCancelQuestion,
  onDeclareContact,
  onDeflect,
  onTimerExpired,
  onOpenDirectGuess,
}) => {
  const [questionText, setQuestionText] = useState('');
  const [deflectWord, setDeflectWord] = useState('');
  const [deflectError, setDeflectError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isHost = currentUser.role === 'host';
  const hasActiveQuestion = !!room.currentQuestion;
  const isQuestionAuthor = room.currentQuestion?.authorId === currentUser.id;
  const isContactDeclared = room.status === 'CONTACT_DECLARED';
  const revealedPrefix = room.secretWord.slice(0, room.revealedLettersCount);

  // Submit question handler
  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onAskQuestion(questionText);
      setQuestionText('');
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Deflect handler for host
  const handleDeflectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deflectWord.trim() || isSubmitting) return;

    setDeflectError(null);
    try {
      setIsSubmitting(true);
      const res = await onDeflect(deflectWord);
      if (res.success) {
        setDeflectWord('');
      } else if (res.error) {
        setDeflectError(res.error);
      }
    } catch (err: unknown) {
      setDeflectError(err instanceof Error ? err.message : 'Ошибка при отбитии');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. Timer banner if Contact is Declared */}
      {isContactDeclared && room.contactData && (
        <Timer
          timerExpiresAt={room.contactData.timerExpiresAt}
          onExpired={onTimerExpired}
          isHost={isHost}
        />
      )}

      {/* 2. Active Question Card (if any) */}
      {hasActiveQuestion && (
        <div className="glass-panel rounded-2xl p-5 border border-indigo-500/30 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    Вопрос от {room.currentQuestion!.authorName}
                  </span>
                  {isQuestionAuthor && (
                    <span className="text-[10px] bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-700/50">
                      Ваш вопрос
                    </span>
                  )}
                </div>
                <p className="text-base sm:text-lg font-medium text-white mt-1">
                  «{room.currentQuestion!.text}»
                </p>
              </div>
            </div>

            {/* Cancel Question (Author only) */}
            {isQuestionAuthor && !isContactDeclared && (
              <button
                onClick={() => onCancelQuestion()}
                className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-800/50 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                Снять вопрос
              </button>
            )}
          </div>

          {/* Contact declared indicator inside question card */}
          {isContactDeclared && (
            <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-amber-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>
                <strong>{room.contactData?.partnerName}</strong> крикнул Контакт! Ждем ответа ведущего...
              </span>
            </div>
          )}
        </div>
      )}

      {/* 3. Role-Based Controls */}
      {isHost ? (
        /* HOST VIEW */
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-amber-500/30">
          <div className="flex items-center gap-2.5 mb-3">
            <Shield className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">Панель ведущего: Отбитие («Это не...»)</h3>
          </div>

          <p className="text-xs text-slate-300 mb-4">
            Если вы поняли, какое слово имел в виду игрок, введите его ниже, чтобы сбросить вопрос и не дать открыть букву.
            Слово обязано начинаться на:{' '}
            <strong className="text-amber-300 font-mono text-sm">{revealedPrefix}...</strong>
          </p>

          <form onSubmit={handleDeflectSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium select-none">
                Это не
              </span>
              <input
                type="text"
                value={deflectWord}
                onChange={(e) => {
                  setDeflectWord(e.target.value);
                  setDeflectError(null);
                }}
                disabled={!hasActiveQuestion}
                placeholder={hasActiveQuestion ? `${revealedPrefix}...` : 'Ждите намёка игроков'}
                className="w-full pl-20 pr-4 py-3 rounded-xl bg-slate-900/90 text-white placeholder-slate-500 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={!hasActiveQuestion || !deflectWord.trim() || isSubmitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Shield className="w-4 h-4" />
              <span>Отбить!</span>
            </button>
          </form>

          {deflectError && (
            <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{deflectError}</span>
            </div>
          )}
        </div>
      ) : (
        /* REGULAR PLAYER VIEW */
        <div className="flex flex-col gap-4">
          {/* Big "ЕСТЬ КОНТАКТ!" Button when question is active and not author */}
          {hasActiveQuestion && !isQuestionAuthor && !isContactDeclared && (
            <button
              onClick={() => onDeclareContact()}
              className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xl sm:text-2xl tracking-wide uppercase shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-3 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] animate-pulse-fast border-2 border-emerald-300/40"
            >
              <Zap className="w-7 h-7 fill-current" />
              <span>ЕСТЬ КОНТАКТ!</span>
            </button>
          )}

          {/* Form to ask question (when no active question) */}
          {!hasActiveQuestion && (
            <div className="glass-panel rounded-2xl p-5 border border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <h4 className="font-semibold text-sm text-slate-200">
                  Задайте намёк на слово (начинается на «{revealedPrefix}...»)
                </h4>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Придумайте ассоциацию, которую поймет хотя бы один другой игрок, но не догадается ведущий.
              </p>

              <form onSubmit={handleAskSubmit} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Это не то, чем копают землю?.."
                  className="flex-1 px-4 py-3 rounded-xl bg-slate-900/90 text-white placeholder-slate-500 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={!questionText.trim() || isSubmitting}
                  className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>Задать</span>
                </button>
              </form>
            </div>
          )}

          {/* Direct Guess entire word shortcut */}
          <div className="flex justify-end">
            <button
              onClick={onOpenDirectGuess}
              className="px-4 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-500/40 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Я знаю тайное слово целиком!</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
