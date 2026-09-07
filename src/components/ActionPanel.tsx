import React, { useState } from 'react';
import { Shield, Zap, XCircle, KeyRound, AlertCircle, CheckCircle2, Lock, Flag, Users, Mic, SkipForward } from 'lucide-react';
import { Room, Player } from '../types/game';
import { Timer } from './Timer';

interface ActionPanelProps {
  room: Room;
  currentUser: Player;
  onAskQuestion: (intendedWord: string) => Promise<void>;
  onCancelQuestion: () => Promise<void>;
  onSkipTurn: () => Promise<void>;
  onDeclareContact: (partnerWord: string) => Promise<void>;
  onJoinContact: (word: string) => Promise<void>;
  onHostGiveUp: () => Promise<void>;
  onDeflect: (word: string) => Promise<{ success: boolean; matched: boolean; error?: string }>;
  onAcceptDeflect: () => Promise<void>;
  onTimerExpired: () => void;
  onOpenDirectGuess: () => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  room,
  currentUser,
  onAskQuestion,
  onCancelQuestion,
  onSkipTurn,
  onDeclareContact,
  onJoinContact,
  onHostGiveUp,
  onDeflect,
  onAcceptDeflect,
  onTimerExpired,
  onOpenDirectGuess,
}) => {
  // Single field for secret word
  const [intendedWord, setIntendedWord] = useState('');
  const [askError, setAskError] = useState<string | null>(null);

  // Deflect state (Host)
  const [deflectWord, setDeflectWord] = useState('');
  const [deflectFeedback, setDeflectFeedback] = useState<{ message: string; isError: boolean } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Declare contact state (First player)
  const [isDeclaringContact, setIsDeclaringContact] = useState(false);
  const [contactWord, setContactWord] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);

  // Join contact state (Other players)
  const [isJoiningContact, setIsJoiningContact] = useState(false);
  const [joinWord, setJoinWord] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const effectiveLeaderId = room.leaderId || room.hostId;
  const isHost = currentUser.id === effectiveLeaderId;
  const hasActiveQuestion = !!room.currentQuestion;
  const isQuestionAuthor = room.currentQuestion?.authorId === currentUser.id;
  const isContactDeclared = room.status === 'CONTACT_DECLARED';
  const revealedPrefix = room.secretWord.slice(0, room.revealedLettersCount);

  // Direct guess cooldown calculation
  const [remainingCooldownSec, setRemainingCooldownSec] = useState(0);

  React.useEffect(() => {
    const checkCooldown = () => {
      const cooldownUntil = room.directGuessCooldowns?.[currentUser.id] || 0;
      const now = Date.now();
      const diff = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
      setRemainingCooldownSec(diff);
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [room.directGuessCooldowns, currentUser.id]);

  // Turn management
  const isMyTurn = !room.activePlayerId || room.activePlayerId === currentUser.id;
  const activePlayerName = room.activePlayerId ? (room.players?.[room.activePlayerId]?.name || 'Игрок') : null;

  const isPrimaryPartner = room.contactData?.partnerId === currentUser.id;
  const hasJoinedContact =
    isPrimaryPartner ||
    !!room.contactData?.additionalPartners?.some((p) => p.id === currentUser.id) ||
    !!room.submissions?.[currentUser.id];

  // 1. Submit single secret word (voice hint given in Discord)
  const handleAskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intendedWord.trim() || isSubmitting) return;

    setAskError(null);
    try {
      setIsSubmitting(true);
      await onAskQuestion(intendedWord.trim().toUpperCase());
      setIntendedWord('');
    } catch (err: unknown) {
      setAskError(err instanceof Error ? err.message : 'Ошибка при отправке слова');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Deflect handler for host
  const handleDeflectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deflectWord.trim() || isSubmitting) return;

    setDeflectFeedback(null);
    try {
      setIsSubmitting(true);
      const res = await onDeflect(deflectWord);
      if (res.matched) {
        setDeflectWord('');
        setDeflectFeedback(null);
      } else {
        setDeflectFeedback({
          message: res.error || `Не угадали! Это не «${deflectWord.toUpperCase()}». Пробуйте ещё!`,
          isError: true,
        });
        setDeflectWord('');
      }
    } catch (err: unknown) {
      setDeflectFeedback({
        message: err instanceof Error ? err.message : 'Ошибка при отбитии',
        isError: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Declare Contact with immediate word input
  const handleDeclareContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactWord.trim() || isSubmitting) return;

    setContactError(null);
    try {
      setIsSubmitting(true);
      await onDeclareContact(contactWord.trim().toUpperCase());
      setIsDeclaringContact(false);
      setContactWord('');
    } catch (err: unknown) {
      setContactError(err instanceof Error ? err.message : 'Ошибка при объявлении контакта');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Join Contact for other players
  const handleJoinContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinWord.trim() || isSubmitting) return;

    setJoinError(null);
    try {
      setIsSubmitting(true);
      await onJoinContact(joinWord.trim().toUpperCase());
      setIsJoiningContact(false);
      setJoinWord('');
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Ошибка при присоединении к контакту');
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
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5 animate-pulse">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                    Голосовой намёк от {room.currentQuestion!.authorName}
                  </span>
                  {isQuestionAuthor && (
                    <span className="text-[10px] bg-indigo-900/60 text-indigo-200 px-2 py-0.5 rounded-full border border-indigo-700/50 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Загадано: «{room.currentQuestion!.intendedWord}»
                    </span>
                  )}
                </div>
                <p className="text-base sm:text-lg font-medium text-white mt-1 flex items-center gap-2">
                  <span>🎙️ Слушайте намёк в Discord / войсе!</span>
                </p>
              </div>
            </div>

            {/* Cancel Question (Author or Host) */}
            {(isQuestionAuthor || isHost) && (
              <button
                onClick={() => onCancelQuestion()}
                className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700/60 hover:border-rose-800/50 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title={isHost ? 'Сбросить вопрос' : 'Снять вопрос'}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isHost && !isQuestionAuthor ? 'Сбросить вопрос' : 'Снять вопрос'}</span>
              </button>
            )}
          </div>

          {/* Contact declared indicator inside question card */}
          {isContactDeclared && (
            <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-amber-300 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>
                  <strong>{room.contactData?.partnerName}</strong> объявил контакт!
                  {isHost ? ' Отгадайте слово или сдайтесь!' : ' Ведущий пытается отгадать...'}
                </span>
              </div>
              {/* Additional partners list */}
              {room.contactData?.additionalPartners && room.contactData.additionalPartners.length > 0 && (
                <div className="flex items-center gap-1.5 text-cyan-300 text-[11px] pl-6">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Также поддержали: <strong>{room.contactData.additionalPartners.map((p) => p.name).join(', ')}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Host recent attempt & Author confirmation button */}
          {room.lastDeflectAttempt && (
            <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-amber-300/90 flex items-center gap-1.5">
                <span>Последняя догадка ведущего:</span>
                <strong className="text-white font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                  «{room.lastDeflectAttempt.word}»
                </strong>
                <span className="text-slate-400">(не совпало)</span>
              </div>

              {/* Author can accept if host named a synonym/valid interpretation */}
              {isQuestionAuthor && (
                <button
                  onClick={() => onAcceptDeflect()}
                  className="self-start sm:self-auto px-3 py-1 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Слово подходит (засчитать отбитие)</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Role-Based Controls */}
      {isHost ? (
        /* HOST VIEW */
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-amber-500/30">
          <div className="flex items-center gap-2.5 mb-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">Панель ведущего: Отбитие («Это не...»)</h3>
          </div>

          <p className="text-xs text-slate-300 mb-4">
            {isContactDeclared
              ? 'Контакт объявлен! Срочно отгадайте задуманное слово или нажмите «Сдаюсь» (+10 очков при успешном отбитии):'
              : 'Слушайте намёк в Discord и отгадайте слово («Это не...») до того, как кто-то нажмет Контакт (+10 очков):'}
            {' '}Слово на букву:{' '}
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
                  setDeflectFeedback(null);
                }}
                disabled={!hasActiveQuestion}
                placeholder={hasActiveQuestion ? `${revealedPrefix}...` : 'Ждите голосового намёка'}
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

          {deflectFeedback && (
            <div className="mt-2.5 text-xs text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/40 flex items-center gap-1.5 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{deflectFeedback.message}</span>
            </div>
          )}

          {/* Early surrender button for host during declared contact */}
          {isContactDeclared && (
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Не знаете слово? Сдайтесь, чтобы сразу сверить слова и открыть букву без ожидания 10 секунд:
              </div>
              <button
                type="button"
                onClick={onHostGiveUp}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-rose-300 hover:text-rose-200 border border-rose-600/30 text-xs font-bold flex items-center justify-center gap-2 transition-colors shrink-0 shadow-md"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Сдаюсь (Не знаю слово)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* REGULAR PLAYER VIEW */
        <div className="flex flex-col gap-4">
          {/* Phase 1: Question active, contact not yet declared */}
          {hasActiveQuestion && !isQuestionAuthor && !isContactDeclared && (
            <div>
              {!isDeclaringContact ? (
                <button
                  onClick={() => {
                    setIsDeclaringContact(true);
                    setContactWord(revealedPrefix);
                    setContactError(null);
                  }}
                  className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xl sm:text-2xl tracking-wide uppercase shadow-2xl shadow-emerald-500/30 flex items-center justify-center gap-3 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] animate-pulse-fast border-2 border-emerald-300/40"
                >
                  <Zap className="w-7 h-7 fill-current" />
                  <span>ЕСТЬ КОНТАКТ!</span>
                </button>
              ) : (
                /* Instant Word Input Form for declaring contact */
                <div className="glass-panel-glow rounded-2xl p-5 sm:p-6 border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-teal-950/40 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                      <Zap className="w-5 h-5 fill-emerald-400" />
                      <span>ОБЪЯВИТЬ КОНТАКТ</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeclaringContact(false);
                        setContactError(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 mb-3">
                    Какое слово вы поняли по голосовому намёку автора?
                    Оно должно начинаться на: <strong className="text-emerald-300 font-mono text-sm">{revealedPrefix}...</strong>
                  </p>

                  <form onSubmit={handleDeclareContactSubmit} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={contactWord}
                      onChange={(e) => {
                        setContactWord(e.target.value.toUpperCase());
                        setContactError(null);
                      }}
                      placeholder={`Слово на ${revealedPrefix}...`}
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-950/90 text-emerald-300 font-mono font-bold text-base uppercase border border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-600"
                    />
                    <button
                      type="submit"
                      disabled={!contactWord.trim() || isSubmitting}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm uppercase shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Подтвердить контакт (+10 очков)</span>
                    </button>
                  </form>

                  {contactError && (
                    <div className="mt-2.5 text-xs text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{contactError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Phase 2: Contact Declared (10s countdown running) */}
          {hasActiveQuestion && isContactDeclared && !isQuestionAuthor && (
            <div>
              {hasJoinedContact ? (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-emerald-200">
                      {isPrimaryPartner ? 'Вы объявили контакт (+10 очков при совпадении)!' : 'Вы поддержали контакт (+5 очков при совпадении)!'}
                    </div>
                    <div className="text-xs text-slate-300">
                      Ваше слово: <strong className="font-mono text-emerald-300">«{room.submissions?.[currentUser.id] || '—'}»</strong>.
                      Ожидаем окончания отсчёта или решения ведущего...
                    </div>
                  </div>
                </div>
              ) : !isJoiningContact ? (
                /* Button for other players to join the contact */
                <button
                  onClick={() => {
                    setIsJoiningContact(true);
                    setJoinWord(revealedPrefix);
                    setJoinError(null);
                  }}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 hover:from-teal-500 hover:to-blue-500 text-white font-bold text-base sm:text-lg shadow-xl shadow-teal-500/20 flex items-center justify-center gap-2.5 transition-all transform hover:scale-[1.01] active:scale-[0.99] border border-cyan-400/30"
                >
                  <Users className="w-5 h-5 text-cyan-200" />
                  <span>🤝 Я тоже знаю! Присоединиться к контакту (+5 очков)</span>
                </button>
              ) : (
                /* Form for other players to enter their word */
                <div className="glass-panel-glow rounded-2xl p-5 border border-cyan-500/40 bg-gradient-to-br from-cyan-950/40 via-slate-900/90 to-blue-950/40 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                      <Users className="w-4 h-4" />
                      <span>ПОДДЕРЖАТЬ КОНТАКТ (+5 ОЧКОВ)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsJoiningContact(false);
                        setJoinError(null);
                      }}
                      className="text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 mb-3">
                    Внимание: по правилам, <strong>все поддержавшие игроки</strong> должны правильно отгадать слово автора.
                    Если кто-то ошибётся — буква не откроется! Слово на: <strong className="text-cyan-300 font-mono">{revealedPrefix}...</strong>
                  </p>

                  <form onSubmit={handleJoinContactSubmit} className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={joinWord}
                      onChange={(e) => {
                        setJoinWord(e.target.value.toUpperCase());
                        setJoinError(null);
                      }}
                      placeholder={`Ваше слово (${revealedPrefix}...)...`}
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-950/90 text-cyan-200 font-mono font-bold text-base uppercase border border-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 placeholder-slate-600"
                    />
                    <button
                      type="submit"
                      disabled={!joinWord.trim() || isSubmitting}
                      className="px-5 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm uppercase shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Подтвердить</span>
                    </button>
                  </form>

                  {joinError && (
                    <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{joinError}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Phase 0: No active question -> Turn based queue */}
          {!hasActiveQuestion && (
            <div>
              {isMyTurn ? (
                /* Current player's turn to speak in Discord & lock in secret word */
                <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-indigo-500/40 bg-gradient-to-br from-indigo-950/30 via-slate-900/90 to-purple-950/30 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Mic className="w-4 h-4 animate-pulse" />
                      </div>
                      <h4 className="font-bold text-base text-white">
                        Ваша очередь загадывать намёк!
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={onSkipTurn}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Передать ход следующему игроку"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Пропустить ход</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                    1. <strong>Озвучьте намёк вслух в Discord / войсе</strong> для всех игроков.<br />
                    2. Введите сюда <strong>секретное слово-отгадку</strong> (начинается на <strong className="text-amber-300 font-mono">{revealedPrefix}...</strong>):
                  </p>

                  <form onSubmit={handleAskSubmit} className="flex flex-col gap-3">
                    <div>
                      <div className="relative">
                        <input
                          type="text"
                          value={intendedWord}
                          onChange={(e) => {
                            setIntendedWord(e.target.value.toUpperCase());
                            setAskError(null);
                          }}
                          placeholder={`Секретное слово (например: ${revealedPrefix}ОПАТА)...`}
                          className="w-full px-4 py-3.5 rounded-xl bg-slate-950/90 text-amber-300 placeholder-slate-600 border border-slate-700/80 focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold uppercase tracking-wider text-base font-mono"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        Слово скрыто от ведущего. Если контакт сработает — вы получите <strong>+10 очков</strong>!
                      </p>
                    </div>

                    {askError && (
                      <div className="text-xs text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{askError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <button
                        type="button"
                        onClick={onSkipTurn}
                        className="px-4 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-medium transition-colors"
                      >
                        Нет идей? Пропустить
                      </button>

                      <button
                        type="submit"
                        disabled={!intendedWord.trim() || isSubmitting}
                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Загадать слово 🎙️</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Another player's turn to speak */
                <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Mic className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">
                    Сейчас очередь игрока: <span className="text-indigo-400 font-extrabold">{activePlayerName}</span>
                  </h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mb-3">
                    Слушайте намёк в Discord / голосовом чате! Как только он загадает слово, вы сможете крикнуть «Контакт!»
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Direct Guess entire word shortcut */}
          <div className="flex justify-end">
            <button
              onClick={onOpenDirectGuess}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
                remainingCooldownSec > 0
                  ? 'bg-amber-950/40 hover:bg-amber-900/40 text-amber-300 border border-amber-500/30'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-500/20 hover:border-indigo-500/40'
              }`}
            >
              <KeyRound className={`w-3.5 h-3.5 ${remainingCooldownSec > 0 ? 'text-amber-400' : 'text-indigo-400'}`} />
              <span>
                {remainingCooldownSec > 0
                  ? `Я знаю слово целиком! (Ждать ${remainingCooldownSec}с)`
                  : 'Я знаю тайное слово целиком! (+25 очков)'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
