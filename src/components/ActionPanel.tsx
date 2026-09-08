import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
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
        <div className="glass-panel rounded-2xl p-5 border border-blue-500/30 relative overflow-hidden bg-gradient-to-b from-blue-950/15 via-zinc-900/70 to-zinc-950/90">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5 animate-pulse">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-300 font-mono">
                    Голосовой намёк: {room.currentQuestion!.authorName}
                  </span>
                  {isQuestionAuthor && (
                    <span className="text-[10px] bg-zinc-900 text-blue-300 px-2.5 py-0.5 rounded-md border border-zinc-700 font-mono flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      Загадано: «{room.currentQuestion!.intendedWord}»
                    </span>
                  )}
                </div>
                <p className="text-base sm:text-lg font-medium text-white mt-1 flex items-center gap-2">
                  <span>🎙️ Слушайте намёк в Discord / голосовом чате</span>
                </p>
              </div>
            </div>

            {/* Cancel Question (Author or Host) */}
            {(isQuestionAuthor || isHost) && (
              <button
                onClick={() => onCancelQuestion()}
                className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-800/50 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title={isHost ? 'Сбросить вопрос' : 'Снять вопрос'}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isHost && !isQuestionAuthor ? 'Сбросить вопрос' : 'Снять вопрос'}</span>
              </button>
            )}
          </div>

          {/* Contact declared indicator inside question card */}
          {isContactDeclared && (
            <div className="mt-3 pt-3 border-t border-zinc-800 text-xs text-amber-300 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>
                  <strong>{room.contactData?.partnerName}</strong> объявил контакт!
                  {isHost ? ' Отгадайте задуманное слово или сдайтесь!' : ' Ведущий пытается отгадать...'}
                </span>
              </div>
              {/* Additional partners list */}
              {room.contactData?.additionalPartners && room.contactData.additionalPartners.length > 0 && (
                <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] pl-6 font-mono">
                  <Users className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    Поддержали контакт: <strong className="text-zinc-200">{room.contactData.additionalPartners.map((p) => p.name).join(', ')}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Host recent attempt & Author confirmation button */}
          {room.lastDeflectAttempt && (
            <div className="mt-3 pt-3 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="text-zinc-400 flex items-center gap-1.5">
                <span>Последняя догадка ведущего:</span>
                <strong className="text-white font-mono bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
                  «{room.lastDeflectAttempt.word}»
                </strong>
                <span className="text-zinc-500">(не совпало)</span>
              </div>

              {/* Author can accept if host named a synonym/valid interpretation */}
              {isQuestionAuthor && (
                <button
                  onClick={() => onAcceptDeflect()}
                  className="self-start sm:self-auto px-3 py-1 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
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
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-amber-500/30 bg-gradient-to-b from-amber-950/15 via-zinc-900/70 to-zinc-950/90">
          <div className="flex items-center gap-2.5 mb-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-white">Панель ведущего: Отбитие («Это не...»)</h3>
          </div>

          <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
            {isContactDeclared
              ? 'Контакт объявлен! Назовите задуманное слово до истечения таймера (+10 очков при успехе):'
              : 'Слушайте намёк в Discord и отбейте слово («Это не...») до нажатия Контакта (+10 очков):'}
            {' '}Слово на букву:{' '}
            <strong className="text-amber-300 font-mono text-sm">{revealedPrefix}...</strong>
          </p>

          <form onSubmit={handleDeflectSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-medium select-none font-mono">
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
                className="w-full pl-20 pr-4 py-3 rounded-xl bg-zinc-950 text-white placeholder-zinc-700 border border-zinc-800 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 font-semibold font-mono disabled:opacity-40 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={!hasActiveQuestion || !deflectWord.trim() || isSubmitting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 border border-amber-400/30 disabled:opacity-40 transition-all"
            >
              <Shield className="w-4 h-4" />
              <span>Отбить!</span>
            </button>
          </form>

          {deflectFeedback && (
            <div className="mt-2.5 text-xs text-amber-300 bg-amber-950/40 p-2.5 rounded-xl border border-amber-800/40 flex items-center gap-1.5 animate-fade-in font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{deflectFeedback.message}</span>
            </div>
          )}

          {/* Early surrender button for host during declared contact */}
          {isContactDeclared && (
            <div className="mt-4 pt-4 border-t border-zinc-800/90 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                Не знаете слово? Сдайтесь, чтобы сразу открыть букву без ожидания 10 секунд:
              </div>
              <button
                type="button"
                onClick={onHostGiveUp}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-rose-950/70 text-rose-300 hover:text-rose-200 border border-rose-800/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shrink-0 shadow-md"
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
                  className="w-full py-5 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xl sm:text-2xl tracking-wider uppercase shadow-2xl shadow-emerald-950/50 flex items-center justify-center gap-3 transform transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] border border-emerald-400/30"
                >
                  <Zap className="w-7 h-7 fill-current" />
                  <span>ЕСТЬ КОНТАКТ!</span>
                </button>
              ) : (
                /* Instant Word Input Form for declaring contact */
                <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-zinc-900/80 to-zinc-950/90 animate-fade-in">
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
                      className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 mb-3">
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
                      className="flex-1 px-4 py-3 rounded-xl bg-zinc-950 text-emerald-300 font-mono font-bold text-base uppercase border border-emerald-500/40 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 placeholder-zinc-700"
                    />
                    <button
                      type="submit"
                      disabled={!contactWord.trim() || isSubmitting}
                      className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm uppercase shadow-lg shadow-emerald-950/50 border border-emerald-400/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Подтвердить (+10 очков)</span>
                    </button>
                  </form>

                  {contactError && (
                    <div className="mt-2.5 text-xs text-rose-300 flex items-center gap-1.5 p-2 rounded-lg bg-rose-950/40 border border-rose-900/50">
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
                <div className="p-4 rounded-2xl bg-zinc-900/90 border border-emerald-500/40 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-emerald-300">
                      {isPrimaryPartner ? 'Вы объявили контакт (+10 очков при совпадении)!' : 'Вы поддержали контакт (+5 очков при совпадении)!'}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Ваше слово: <strong className="font-mono text-zinc-100">«{room.submissions?.[currentUser.id] || '—'}»</strong>.
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
                  className="w-full py-4 px-6 rounded-2xl bg-zinc-900 hover:bg-zinc-850 text-zinc-100 font-bold text-base sm:text-lg shadow-xl shadow-black/40 flex items-center justify-center gap-2.5 transition-all border border-zinc-700/60"
                >
                  <Users className="w-5 h-5 text-blue-400" />
                  <span>Я тоже знаю! Присоединиться к контакту (+5 очков)</span>
                </button>
              ) : (
                /* Form for other players to enter their word */
                <div className="glass-panel rounded-2xl p-5 border border-blue-500/40 bg-gradient-to-b from-blue-950/20 via-zinc-900/80 to-zinc-950/90 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                      <Users className="w-4 h-4" />
                      <span>ПОДДЕРЖАТЬ КОНТАКТ (+5 ОЧКОВ)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsJoiningContact(false);
                        setJoinError(null);
                      }}
                      className="text-xs text-zinc-400 hover:text-white px-2.5 py-1 rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                      Отмена
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 mb-3">
                    Внимание: по правилам, <strong>все поддержавшие игроки</strong> должны правильно отгадать слово автора.
                    Если кто-то ошибётся — буква не откроется! Слово на: <strong className="text-blue-300 font-mono">{revealedPrefix}...</strong>
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
                      className="flex-1 px-4 py-3 rounded-xl bg-zinc-950 text-blue-300 font-mono font-bold text-base uppercase border border-blue-500/40 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 placeholder-zinc-700"
                    />
                    <button
                      type="submit"
                      disabled={!joinWord.trim() || isSubmitting}
                      className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase shadow-lg shadow-blue-950/50 border border-blue-400/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Подтвердить</span>
                    </button>
                  </form>

                  {joinError && (
                    <div className="mt-2 text-xs text-rose-300 flex items-center gap-1.5 p-2 rounded-lg bg-rose-950/40 border border-rose-900/50">
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
                <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-blue-500/30 bg-gradient-to-b from-blue-950/15 via-zinc-900/70 to-zinc-950/90 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                        <Mic className="w-4 h-4 animate-pulse" />
                      </div>
                      <h4 className="font-bold text-base text-white">
                        Ваша очередь загадывать намёк!
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={onSkipTurn}
                      className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
                      title="Передать ход следующему игроку"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Пропустить ход</span>
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                    1. <strong>Озвучьте намёк голосом в Discord</strong> для всех участников.<br />
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
                          className="w-full px-4 py-3.5 rounded-xl bg-zinc-950 text-amber-300 placeholder-zinc-700 border border-zinc-800 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 font-bold uppercase tracking-wider text-base font-mono transition-colors"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1.5 font-mono">
                        Слово скрыто от ведущего. За успешный контакт вы получите <strong>+10 очков</strong>.
                      </p>
                    </div>

                    {askError && (
                      <div className="text-xs text-rose-300 flex items-center gap-1.5 p-2 rounded-lg bg-rose-950/40 border border-rose-900/50">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{askError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <button
                        type="button"
                        onClick={onSkipTurn}
                        className="px-4 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs font-medium transition-colors"
                      >
                        Нет идей? Пропустить
                      </button>

                      <button
                        type="submit"
                        disabled={!intendedWord.trim() || isSubmitting}
                        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40 border border-blue-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Загадать слово 🎙️</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Another player's turn to speak */
                <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/[0.08] text-center">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-blue-400 border border-zinc-800 flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Mic className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">
                    Очередь игрока: <span className="text-blue-400 font-extrabold">{activePlayerName}</span>
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mb-1 leading-relaxed">
                    Слушайте намёк в Discord / голосовом чате. Как только он загадает слово, появится кнопка «КОНТАКТ!».
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
                  ? 'bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border border-amber-500/30'
                  : 'bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <KeyRound className={`w-3.5 h-3.5 ${remainingCooldownSec > 0 ? 'text-amber-400' : 'text-blue-400'}`} />
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
