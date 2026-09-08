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
  onPassTurnTo?: (targetPlayerId: string) => Promise<void>;
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
  onPassTurnTo,
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
  const otherEligiblePlayers = Object.values(room.players || {}).filter(
    (p) => p.id !== effectiveLeaderId && p.id !== currentUser.id
  );

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
  const activePlayerName = room.activePlayerId ? (room.players?.[room.activePlayerId]?.name || 'Гравець') : null;

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
      setAskError(err instanceof Error ? err.message : 'Помилка при відправці слова');
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
          message: res.error || `Не вгадали! Це не «${deflectWord.toUpperCase()}». Спробуйте ще!`,
          isError: true,
        });
        setDeflectWord('');
      }
    } catch (err: unknown) {
      setDeflectFeedback({
        message: err instanceof Error ? err.message : 'Помилка при відбитті',
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
      setContactError(err instanceof Error ? err.message : 'Помилка при оголошенні контакту');
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
      setJoinError(err instanceof Error ? err.message : 'Помилка при приєднанні до контакту');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-5">
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
        <div className="glass-panel-elevated rounded-3xl p-5 sm:p-6 border border-blue-500/30 relative overflow-hidden specular-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5 shadow-lg shadow-blue-950/40">
                <Mic className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-400 font-mono flex items-center gap-1.5">
                    <span>Ефір Discord:</span>
                    <strong className="text-white">{room.currentQuestion!.authorName}</strong>
                  </span>
                  {/* Visual Audio Waveform */}
                  <div className="flex items-end gap-0.5 h-3.5 px-1 py-0.5">
                    <span className="w-0.5 bg-blue-400 rounded-full animate-audio-bar-1" />
                    <span className="w-0.5 bg-blue-400 rounded-full animate-audio-bar-2" />
                    <span className="w-0.5 bg-blue-400 rounded-full animate-audio-bar-3" />
                    <span className="w-0.5 bg-blue-400 rounded-full animate-audio-bar-4" />
                  </div>
                  {isQuestionAuthor && (
                    <span className="text-[10px] bg-[#07090e] text-blue-300 px-2.5 py-0.5 rounded-lg border border-blue-500/30 font-mono flex items-center gap-1 shadow-inner">
                      <Lock className="w-2.5 h-2.5" />
                      Загадано: «{room.currentQuestion!.intendedWord}»
                    </span>
                  )}
                </div>
                <p className="text-base sm:text-lg font-bold text-white mt-1 flex items-center gap-2">
                  <span>Слухайте намёк у голосовому чаті Discord</span>
                </p>
              </div>
            </div>

            {/* Cancel Question (Author or Host) */}
            {(isQuestionAuthor || isHost) && (
              <button
                onClick={() => onCancelQuestion()}
                className="self-end sm:self-center px-3.5 py-2 rounded-xl bg-[#07090e]/80 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title={isHost ? 'Скинути питання' : 'Зняти питання'}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isHost && !isQuestionAuthor ? 'Скинути питання' : 'Зняти питання'}</span>
              </button>
            )}
          </div>

          {/* Contact declared indicator inside question card */}
          {isContactDeclared && (
            <div className="mt-4 pt-4 border-t border-white/[0.08] text-xs text-amber-300 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>
                  <strong>{room.contactData?.partnerName}</strong> оголосив контакт!
                  {isHost ? ' Відгадайте задумане слово або здайтеся!' : ' Ведучий намагається відгадати...'}
                </span>
              </div>
              {/* Additional partners list */}
              {room.contactData?.additionalPartners && room.contactData.additionalPartners.length > 0 && (
                <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] pl-6 font-mono">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    Підтримали контакт: <strong className="text-zinc-200">{room.contactData.additionalPartners.map((p) => p.name).join(', ')}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Host recent attempt & Author confirmation button */}
          {room.lastDeflectAttempt && (
            <div className="mt-4 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-zinc-400 flex items-center gap-2">
                <span>Остання спроба ведучого:</span>
                <strong className="text-white font-mono bg-[#07090e] px-2.5 py-1 rounded-lg border border-white/[0.08] text-amber-300">
                  «{room.lastDeflectAttempt.word}»
                </strong>
                <span className="text-zinc-500">(не співпало)</span>
              </div>

              {/* Author can accept if host named a synonym/valid interpretation */}
              {isQuestionAuthor && (
                <button
                  onClick={() => onAcceptDeflect()}
                  className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Слово підходить (зарахувати відбиття)</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. Role-Based Controls */}
      {isHost ? (
        /* HOST VIEW */
        <div className="glass-panel-elevated rounded-3xl p-5 sm:p-7 border border-amber-500/30 relative overflow-hidden specular-border">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-base text-white">Панель ведучого: Відбиття («Це не...»)</h3>
          </div>

          <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
            {isContactDeclared
              ? 'Контакт оголошено! Назвіть задумане слово до завершення таймера (+10 очок при успіху):'
              : 'Слухайте намёк у Discord і відбийте слово («Це не...») до натискання Контакту (+10 очок):'}
            {' '}Слово на букву:{' '}
            <strong className="text-amber-300 font-mono text-sm">{revealedPrefix}...</strong>
          </p>

          <form onSubmit={handleDeflectSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-semibold select-none font-mono">
                Це не
              </span>
              <input
                type="text"
                value={deflectWord}
                onChange={(e) => {
                  setDeflectWord(e.target.value);
                  setDeflectFeedback(null);
                }}
                disabled={!hasActiveQuestion}
                placeholder={hasActiveQuestion ? `${revealedPrefix}...` : 'Чекайте на голосовий намёк'}
                className="w-full pl-20 pr-4 py-3.5 rounded-2xl bg-[#07090e] text-white placeholder-zinc-700 border border-white/[0.09] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-bold font-mono text-base disabled:opacity-40 transition-colors shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={!hasActiveQuestion || !deflectWord.trim() || isSubmitting}
              className="px-7 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 border border-amber-400/40 disabled:opacity-40 transition-all cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>Відбити!</span>
            </button>
          </form>

          {deflectFeedback && (
            <div className="mt-3 text-xs text-amber-300 bg-amber-950/30 p-3 rounded-xl border border-amber-500/30 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{deflectFeedback.message}</span>
            </div>
          )}

          {/* Early surrender button for host during declared contact */}
          {isContactDeclared && (
            <div className="mt-4 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">
                Не знаєте слова? Здайтеся, щоб відкрити букву без очікування 10 секунд:
              </div>
              <button
                type="button"
                onClick={onHostGiveUp}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#07090e] hover:bg-rose-950/60 text-rose-300 hover:text-rose-200 border border-rose-800/40 text-xs font-semibold flex items-center justify-center gap-2 transition-colors shrink-0 shadow-md cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Здаюся (Не знаю слово)</span>
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
                  className="w-full py-5 px-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xl sm:text-2xl tracking-wider uppercase shadow-[0_0_40px_-5px_rgba(16,185,129,0.35)] flex items-center justify-center gap-3 transform transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] border border-emerald-400/40 specular-border cursor-pointer"
                >
                  <Zap className="w-7 h-7 fill-current" />
                  <span>Є КОНТАКТ!</span>
                </button>
              ) : (
                /* Instant Word Input Form for declaring contact */
                <div className="glass-panel-elevated rounded-3xl p-5 sm:p-7 border border-emerald-500/40 relative overflow-hidden specular-border animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-base tracking-wide">
                      <Zap className="w-5 h-5 fill-emerald-400" />
                      <span>ОГОЛОСИТИ КОНТАКТ</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeclaringContact(false);
                        setContactError(null);
                      }}
                      className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Скасувати
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 mb-4">
                    Яке слово ви зрозуміли за голосовим намёком автора?
                    Воно повинно починатися на: <strong className="text-emerald-300 font-mono text-sm">{revealedPrefix}...</strong>
                  </p>

                  <form onSubmit={handleDeclareContactSubmit} className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      autoFocus
                      value={contactWord}
                      onChange={(e) => {
                        setContactWord(e.target.value.toUpperCase());
                        setContactError(null);
                      }}
                      placeholder={`Слово на ${revealedPrefix}...`}
                      className="flex-1 px-4 py-3.5 rounded-2xl bg-[#07090e] text-emerald-300 font-mono font-bold text-base uppercase border border-emerald-500/40 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 placeholder-zinc-700 shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={!contactWord.trim() || isSubmitting}
                      className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm uppercase shadow-lg shadow-emerald-950/50 border border-emerald-400/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Підтвердити (+10 очок)</span>
                    </button>
                  </form>

                  {contactError && (
                    <div className="mt-3 text-xs text-rose-300 flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/50">
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
                <div className="p-5 rounded-3xl bg-[#07090e]/90 border border-emerald-500/40 flex items-center gap-3.5 shadow-lg shadow-black/50">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-emerald-300">
                      {isPrimaryPartner ? 'Ви оголосили контакт (+10 очок при співпадінні)!' : 'Ви підтримали контакт (+5 очок при співпадінні)!'}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5">
                      Ваше слово: <strong className="font-mono text-zinc-100">«{room.submissions?.[currentUser.id] || '—'}»</strong>.
                      Очікуємо завершення відліку або рішення ведучого...
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
                  className="w-full py-4 px-6 rounded-2xl bg-[#0b0e18] hover:bg-zinc-900 text-zinc-100 font-bold text-base sm:text-lg shadow-xl shadow-black/50 flex items-center justify-center gap-2.5 transition-all border border-white/[0.09] cursor-pointer"
                >
                  <Users className="w-5 h-5 text-blue-400" />
                  <span>Я теж знаю! Приєднатися до контакту (+5 очок)</span>
                </button>
              ) : (
                /* Form for other players to enter their word */
                <div className="glass-panel-elevated rounded-3xl p-5 sm:p-6 border border-blue-500/40 relative overflow-hidden specular-border animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-blue-300 font-bold text-sm">
                      <Users className="w-4 h-4" />
                      <span>ПІДТРИМАТИ КОНТАКТ (+5 ОЧОК)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsJoiningContact(false);
                        setJoinError(null);
                      }}
                      className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Скасувати
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 mb-3 leading-relaxed">
                    Увага: за правилами, <strong>всі гравці, що підтримали</strong>, повинні правильно вказати слово автора.
                    Якщо хтось помилиться — буква не відкриється! Слово на: <strong className="text-blue-300 font-mono">{revealedPrefix}...</strong>
                  </p>

                  <form onSubmit={handleJoinContactSubmit} className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      autoFocus
                      value={joinWord}
                      onChange={(e) => {
                        setJoinWord(e.target.value.toUpperCase());
                        setJoinError(null);
                      }}
                      placeholder={`Ваше слово (${revealedPrefix}...)...`}
                      className="flex-1 px-4 py-3.5 rounded-2xl bg-[#07090e] text-blue-300 font-mono font-bold text-base uppercase border border-blue-500/40 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder-zinc-700 shadow-inner"
                    />
                    <button
                      type="submit"
                      disabled={!joinWord.trim() || isSubmitting}
                      className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm uppercase shadow-lg shadow-blue-950/50 border border-blue-400/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Підтвердити</span>
                    </button>
                  </form>

                  {joinError && (
                    <div className="mt-2.5 text-xs text-rose-300 flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/50">
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
                <div className="glass-panel-elevated rounded-3xl p-5 sm:p-7 border border-blue-500/30 relative overflow-hidden specular-border animate-fade-in">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-md">
                        <Mic className="w-4 h-4 animate-pulse" />
                      </div>
                      <h4 className="font-bold text-base text-white">
                        Ваша черга загадувати намёк!
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {onPassTurnTo && otherEligiblePlayers.length > 0 && (
                        <div className="relative">
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                onPassTurnTo(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#07090e] text-blue-300 border border-blue-500/30 text-xs font-semibold cursor-pointer focus:outline-none hover:border-blue-400 transition-colors shadow-inner"
                            title="Передати чергу ходу обраному гравцю"
                          >
                            <option value="" disabled>
                              👉 Передати хід...
                            </option>
                            {otherEligiblePlayers.map((p) => (
                              <option key={p.id} value={p.id} className="bg-[#0b0e18] text-white">
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={onSkipTurn}
                        className="px-3.5 py-1.5 rounded-xl bg-[#07090e]/80 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/[0.08] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Передати хід наступному гравцю по колу"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        <span>Пропустити хід</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-300 mb-4 leading-relaxed bg-[#07090e]/60 p-3.5 rounded-2xl border border-white/[0.06]">
                    <p className="mb-1">
                      <span className="inline-block w-4 h-4 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold text-center mr-1.5">1</span>
                      <strong>Озвучте намёк голосом у Discord</strong> для всіх учасників.
                    </p>
                    <p>
                      <span className="inline-block w-4 h-4 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold text-center mr-1.5">2</span>
                      Введіть сюди <strong>секретне слово-відгадку</strong> (починається на <strong className="text-amber-300 font-mono">{revealedPrefix}...</strong>):
                    </p>
                  </div>

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
                          placeholder={`Секретне слово (наприклад: ${revealedPrefix}ОПАТА)...`}
                          className="w-full px-4 py-3.5 rounded-2xl bg-[#07090e] text-amber-300 placeholder-zinc-700 border border-white/[0.09] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-bold uppercase tracking-wider text-base font-mono transition-colors shadow-inner"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1.5 font-mono">
                        Слово приховано від ведучого. За успішний контакт ви отримаєте <strong>+10 очок</strong>.
                      </p>
                    </div>

                    {askError && (
                      <div className="text-xs text-rose-300 flex items-center gap-1.5 p-2.5 rounded-xl bg-rose-950/40 border border-rose-900/50">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{askError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-1">
                      <button
                        type="button"
                        onClick={onSkipTurn}
                        className="px-4 py-3 rounded-xl bg-[#07090e]/80 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/[0.08] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Немає ідей? Пропустити
                      </button>

                      <button
                        type="submit"
                        disabled={!intendedWord.trim() || isSubmitting}
                        className="px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 border border-blue-400/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Загадати слово 🎙️</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Another player's turn to speak */
                <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden specular-border">
                  <div className="w-14 h-14 rounded-2xl bg-[#07090e] text-blue-400 border border-white/[0.09] flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <Mic className="w-7 h-7 animate-pulse text-blue-400" />
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-white mb-1 tracking-tight">
                    Черга гравця: <span className="text-blue-400">{activePlayerName}</span>
                  </h4>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto mb-1 leading-relaxed">
                    Слухайте намёк у Discord / голосовому чаті. Як тільки він загадає слово, з’явиться кнопка «Є КОНТАКТ!».
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Direct Guess entire word shortcut */}
          <div className="flex justify-end">
            <button
              onClick={onOpenDirectGuess}
              className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                remainingCooldownSec > 0
                  ? 'bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border border-amber-500/30'
                  : 'bg-[#0b0e18] hover:bg-zinc-900 text-zinc-300 hover:text-white border border-white/[0.09] hover:border-blue-500/40'
              }`}
            >
              <KeyRound className={`w-3.5 h-3.5 ${remainingCooldownSec > 0 ? 'text-amber-400' : 'text-blue-400'}`} />
              <span>
                {remainingCooldownSec > 0
                  ? `Я знаю слово цілком! (Чекати ${remainingCooldownSec}с)`
                  : 'Я знаю таємне слово цілком! (+25 очок)'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
