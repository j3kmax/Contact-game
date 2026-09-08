import React, { useState, useEffect, useRef } from 'react';
import { Shield, Zap, XCircle, KeyRound, AlertCircle, CheckCircle2, Lock, Flag, Users, Mic, SkipForward, Clock } from 'lucide-react';
import { Room, Player } from '../types/game';
import { Timer } from './Timer';
import { sounds } from '../services/sound';

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
  onTurnTimeout?: () => void;
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
  onTurnTimeout,
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
  const isLobbyHost = currentUser.id === room.hostId;
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
  const activePlayerName = room.activePlayerId ? (room.players?.[room.activePlayerId]?.name || 'Игрок') : null;

  // 20s Turn timer countdown
  const [turnSecondsLeft, setTurnSecondsLeft] = useState<number>(20);
  const lastTurnTicked = useRef<number | null>(null);

  // Clear unsubmitted text when turn changes
  useEffect(() => {
    setIntendedWord('');
    setAskError(null);
  }, [room.activePlayerId]);

  useEffect(() => {
    if (!room.turnExpiresAt || hasActiveQuestion || room.status !== 'QUESTION_PHASE') {
      lastTurnTicked.current = null;
      return;
    }

    const updateSeconds = () => {
      const remainingMs = room.turnExpiresAt! - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      setTurnSecondsLeft(remainingSec);

      if (isMyTurn && remainingSec > 0 && remainingSec <= 3 && remainingSec !== lastTurnTicked.current) {
        lastTurnTicked.current = remainingSec;
        sounds.playTick(true);
      }

      if (remainingMs <= 0) {
        onTurnTimeout?.();
      }
    };

    updateSeconds();
    const interval = setInterval(updateSeconds, 100);
    return () => clearInterval(interval);
  }, [room.turnExpiresAt, hasActiveQuestion, room.status, isMyTurn, onTurnTimeout]);

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
          message: res.error || `Не угадали! Это не «${deflectWord.toUpperCase()}». Попробуйте ещё!`,
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
      setJoinError(err instanceof Error ? err.message : 'Ошибка при подключении к контакту');
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
                    <span>Эфир Discord:</span>
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
                  <span>Слушайте намёк в голосовом чате Discord</span>
                </p>
              </div>
            </div>

            {/* Cancel Question (Author or Host) */}
            {(isQuestionAuthor || isHost) && (
              <button
                onClick={() => onCancelQuestion()}
                className="self-end sm:self-center px-3.5 py-2 rounded-xl bg-[#07090e]/80 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-white/[0.08] hover:border-rose-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                title={isHost ? 'Сбросить вопрос' : 'Снять вопрос'}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>{isHost && !isQuestionAuthor ? 'Сбросить вопрос' : 'Снять вопрос'}</span>
              </button>
            )}
          </div>

          {/* Contact declared indicator inside question card */}
          {isContactDeclared && (
            <div className="mt-4 pt-4 border-t border-white/[0.08] text-xs text-amber-300 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-semibold">
                <Zap className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>
                  <strong>{room.contactData?.partnerName}</strong> объявил контакт!
                  {isHost ? ' Отгадайте задуманное слово или сдайтесь!' : ' Ведущий пытается отгадать...'}
                </span>
              </div>
              {/* Additional partners list */}
              {room.contactData?.additionalPartners && room.contactData.additionalPartners.length > 0 && (
                <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] pl-6 font-mono">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    Поддержали контакт: <strong className="text-zinc-200">{room.contactData.additionalPartners.map((p) => p.name).join(', ')}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Host recent attempt & Author confirmation button */}
          {room.lastDeflectAttempt && (
            <div className="mt-4 pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-zinc-400 flex items-center gap-2">
                <span>Последняя попытка ведущего:</span>
                <strong className="text-white font-mono bg-[#07090e] px-2.5 py-1 rounded-lg border border-white/[0.08] text-amber-300">
                  «{room.lastDeflectAttempt.word}»
                </strong>
                <span className="text-zinc-500">(не совпало)</span>
              </div>

              {/* Author can accept if host named a synonym/valid interpretation */}
              {isQuestionAuthor && (
                <button
                  onClick={() => onAcceptDeflect()}
                  className="self-start sm:self-auto px-3.5 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Слово подходит (зачесть отбитие)</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Used / Eliminated words indicator */}
      {((room.hostWords && room.hostWords.length > 0) || (room.askedWords && room.askedWords.length > 0)) && (
        <div className="glass-panel-elevated rounded-2xl p-3.5 border border-white/[0.07] specular-border flex flex-col gap-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Использованные слова раунда
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Нельзя загадывать или использовать как отгадки</span>
          </div>
          <div className="flex flex-wrap gap-1.5 items-center">
            {room.hostWords?.map((w) => (
              <span
                key={`host-${w}`}
                className="px-2.5 py-1 rounded-xl bg-rose-950/40 text-rose-300 border border-rose-800/40 text-xs font-mono font-bold flex items-center gap-1 shadow-sm"
                title="Называл ведущий (нельзя загадывать и использовать как отгадку)"
              >
                <span className="text-[10px] text-rose-400/80">Ведущий:</span>
                <span className="line-through">{w.toUpperCase()}</span>
              </span>
            ))}
            {room.askedWords?.map((w) => (
              <span
                key={`asked-${w}`}
                className="px-2.5 py-1 rounded-xl bg-zinc-900/90 text-zinc-300 border border-white/[0.08] text-xs font-mono font-medium flex items-center gap-1 shadow-sm"
                title="Уже загадывалось (нельзя повторно загадывать или использовать как отгадку)"
              >
                <span className="text-[10px] text-zinc-500">Загадано:</span>
                <span className="line-through">{w.toUpperCase()}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 3. Role-Based Controls */}
      {isHost ? (
        /* HOST VIEW */
        <div className="glass-panel-elevated rounded-3xl p-5 sm:p-7 border border-amber-400/40 shadow-[0_0_40px_rgba(245,158,11,0.25)] relative overflow-hidden specular-border">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500/25 to-orange-500/25 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.35)]">
                <Shield className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-base text-white">Панель ведущего: Отбитие («Это не...»)</h3>
            </div>
            {room.status === 'QUESTION_PHASE' && !hasActiveQuestion && room.activePlayerId && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#060818] border border-amber-400/40 text-xs font-mono text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Ход: <strong className="text-white">{activePlayerName}</strong> ({turnSecondsLeft}с)</span>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
            {isContactDeclared
              ? 'Контакт объявлен! Назовите задуманное слово до окончания таймера (+10 очков при успехе):'
              : 'Слушайте намёк в Discord и отбейте слово («Это не...») до нажатия Контакта (+10 очков):'}
            {' '}Слово на букву:{' '}
            <strong className="text-amber-300 font-mono text-sm">{revealedPrefix}...</strong>
          </p>

          <form onSubmit={handleDeflectSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500 font-bold select-none font-mono">
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
                placeholder={hasActiveQuestion ? `${revealedPrefix}...` : 'Ждите голосовой намёк'}
                className="w-full pl-20 pr-4 py-3.5 rounded-2xl bg-[#060818] text-amber-200 placeholder-zinc-700 border border-amber-400/40 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/40 font-bold font-mono text-base disabled:opacity-40 transition-all shadow-[0_0_15px_rgba(245,158,11,0.1)]"
              />
            </div>

            <button
              type="submit"
              disabled={!hasActiveQuestion || !deflectWord.trim() || isSubmitting}
              className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black flex items-center justify-center gap-2 shadow-[0_0_35px_rgba(245,158,11,0.65)] border border-amber-300/80 disabled:opacity-40 transition-all cursor-pointer active:scale-95"
            >
              <Shield className="w-4 h-4" />
              <span>Отбить!</span>
            </button>
          </form>

          {deflectFeedback && (
            <div className="mt-3 text-xs text-amber-200 bg-amber-950/40 p-3 rounded-xl border border-amber-400/50 flex items-center gap-2 font-medium shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{deflectFeedback.message}</span>
            </div>
          )}

          {/* Early surrender button for host during declared contact */}
          {isContactDeclared && (
            <div className="mt-4 pt-4 border-t border-white/[0.1] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-zinc-300">
                Не знаете слово? Сдайтесь, чтобы открыть букву без ожидания 10 секунд:
              </div>
              <button
                type="button"
                onClick={onHostGiveUp}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0c0816] hover:bg-rose-950/70 text-rose-300 hover:text-rose-100 border border-rose-600/40 hover:border-rose-500 text-xs font-semibold flex items-center justify-center gap-2 transition-all shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.25)] cursor-pointer active:scale-95"
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
                  className="w-full py-5 px-6 rounded-3xl bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 hover:from-emerald-300 hover:to-cyan-300 text-slate-950 font-black text-xl sm:text-2xl tracking-widest uppercase shadow-[0_0_50px_rgba(16,185,129,0.7),0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-3 transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] border border-emerald-200/90 specular-border cursor-pointer"
                >
                  <Zap className="w-7 h-7 fill-current" />
                  <span>ЕСТЬ КОНТАКТ!</span>
                </button>
              ) : (
                /* Instant Word Input Form for declaring contact */
                <div className="glass-panel-elevated rounded-3xl p-5 sm:p-7 border border-emerald-500/40 relative overflow-hidden specular-border animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-black text-base tracking-wide">
                      <Zap className="w-5 h-5 fill-emerald-400" />
                      <span>ОБЪЯВИТЬ КОНТАКТ</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsDeclaringContact(false);
                        setContactError(null);
                      }}
                      className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 mb-4">
                    Какое слово вы поняли по голосовому намёку автора?
                    Оно должно начинаться на: <strong className="text-emerald-300 font-mono text-sm">{revealedPrefix}...</strong>
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
                      className="flex-1 px-4 py-3.5 rounded-2xl bg-[#060818] text-emerald-300 font-mono font-bold text-base uppercase border border-emerald-400/50 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50 placeholder-zinc-700 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    />
                    <button
                      type="submit"
                      disabled={!contactWord.trim() || isSubmitting}
                      className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 hover:from-emerald-400 hover:to-cyan-300 text-slate-950 font-black text-sm uppercase shadow-[0_0_30px_rgba(16,185,129,0.6)] border border-emerald-300/80 flex items-center justify-center gap-2 disabled:opacity-50 transition-all cursor-pointer active:scale-95"
                    >
                      <Zap className="w-4 h-4 fill-current" />
                      <span>Подтвердить (+10 очков)</span>
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
                <div className="p-5 rounded-3xl bg-[#060918]/90 border border-emerald-400/50 flex items-center gap-3.5 shadow-[0_0_25px_rgba(16,185,129,0.25)]">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 drop-shadow-[0_0_8px_#34d399]" />
                  <div>
                    <div className="text-sm font-bold text-emerald-300">
                      {isPrimaryPartner ? 'Вы объявили контакт (+10 очков при совпадении)!' : 'Вы поддержали контакт (+5 очков при совпадении)!'}
                    </div>
                    <div className="text-xs text-zinc-300 mt-0.5">
                      Ваше слово: <strong className="font-mono text-white">«{room.submissions?.[currentUser.id] || '—'}»</strong>.
                      Ожидаем завершения отсчета или решения ведущего...
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
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-600/25 via-blue-600/30 to-indigo-600/25 hover:from-cyan-500/40 hover:to-blue-500/40 text-cyan-200 hover:text-white font-bold text-base sm:text-lg shadow-[0_0_25px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2.5 transition-all border border-cyan-400/40 hover:border-cyan-300 cursor-pointer active:scale-98"
                >
                  <Users className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_6px_#22d3ee]" />
                  <span>Я тоже знаю! Поддержать контакт (+5 очков)</span>
                </button>
              ) : (
                /* Form for other players to enter their word */
                <div className="glass-panel-elevated rounded-3xl p-5 sm:p-6 border border-blue-500/40 relative overflow-hidden specular-border animate-fade-in">
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
                      className="text-xs text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      Отмена
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 mb-3 leading-relaxed">
                    Внимание: по правилам, <strong>все поддержавшие игроки</strong> должны правильно указать слово автора.
                    Если кто-то ошибётся — буква не откроется! Слово на: <strong className="text-blue-300 font-mono">{revealedPrefix}...</strong>
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
                      <span>Подтвердить</span>
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
                <div className="glass-panel-elevated rounded-3xl p-5 sm:p-7 border border-cyan-400/50 shadow-[0_0_40px_rgba(6,182,212,0.3)] relative overflow-hidden specular-border animate-fade-in">
                  {/* 20s Turn Progress Bar */}
                  {room.turnExpiresAt && (
                    <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden mb-4 border border-white/[0.1] p-0.5">
                      <div
                        className={`h-full transition-all duration-150 rounded-full ${
                          turnSecondsLeft <= 3
                            ? 'bg-gradient-to-r from-rose-500 via-rose-400 to-amber-300 shadow-[0_0_16px_#f43f5e]'
                            : turnSecondsLeft <= 6
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_14px_#f59e0b]'
                            : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 shadow-[0_0_16px_#22d3ee]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, (turnSecondsLeft / 20) * 100))}%` }}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/25 to-blue-500/25 text-cyan-300 border border-cyan-400/50 flex items-center justify-center shadow-[0_0_18px_rgba(6,182,212,0.4)]">
                        <Mic className="w-5 h-5 animate-pulse text-cyan-300" />
                      </div>
                      <div>
                        <h4 className="font-bold text-base text-white">
                          Ваша очередь загадывать намёк!
                        </h4>
                        <p className="text-[11px] text-zinc-300">
                          На ход даётся <strong className="text-white">20 секунд</strong>. Если не успеть — ход переходит дальше.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 20s Countdown Badge */}
                      {room.turnExpiresAt && (
                        <div
                          className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] ${
                            turnSecondsLeft <= 3
                              ? 'bg-rose-950/70 text-rose-200 border-rose-400/60 animate-pulse shadow-[0_0_18px_rgba(244,63,94,0.5)]'
                              : turnSecondsLeft <= 6
                              ? 'bg-amber-950/60 text-amber-200 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                              : 'bg-cyan-950/60 text-cyan-200 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.35)]'
                          }`}
                          title="Оставшееся время на озвучивание намёка и ввод слова"
                        >
                          <Clock className={`w-3.5 h-3.5 ${turnSecondsLeft <= 3 ? 'text-rose-400 animate-spin' : 'text-cyan-400'}`} />
                          <span>{turnSecondsLeft}с</span>
                        </div>
                      )}

                      {isLobbyHost && onPassTurnTo && otherEligiblePlayers.length > 0 && (
                        <div className="relative">
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) {
                                onPassTurnTo(e.target.value);
                                e.target.value = '';
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#060818] text-cyan-300 border border-cyan-400/40 text-xs font-semibold cursor-pointer focus:outline-none hover:border-cyan-300 transition-colors shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                            title="Передать очередь хода выбранному игроку (только хост)"
                          >
                            <option value="" disabled>
                              👉 Передать ход...
                            </option>
                            {otherEligiblePlayers.map((p) => (
                              <option key={p.id} value={p.id} className="bg-[#0b0e24] text-white">
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={onSkipTurn}
                        className="px-3.5 py-1.5 rounded-xl bg-[#060818] hover:bg-zinc-900 text-zinc-300 hover:text-white border border-white/[0.12] hover:border-cyan-400/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Передать ход следующему игроку по кругу"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        <span>Пропустить ход</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-300 mb-4 leading-relaxed bg-[#060818]/70 p-3.5 rounded-2xl border border-white/[0.08]">
                    <p className="mb-1">
                      <span className="inline-block w-4 h-4 rounded-full bg-cyan-500/25 text-cyan-300 text-[10px] font-bold text-center mr-1.5">1</span>
                      <strong>Озвучьте намёк голосом в Discord</strong> для всех участников.
                    </p>
                    <p>
                      <span className="inline-block w-4 h-4 rounded-full bg-cyan-500/25 text-cyan-300 text-[10px] font-bold text-center mr-1.5">2</span>
                      Введите сюда <strong>секретное слово-отгадку</strong> (начинается на <strong className="text-amber-300 font-mono">{revealedPrefix}...</strong>):
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
                          placeholder={`Секретное слово (например: ${revealedPrefix}ОПАТА)...`}
                          className="w-full px-4 py-3.5 rounded-2xl bg-[#060818] text-amber-200 placeholder-zinc-700 border border-cyan-400/40 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 font-bold uppercase tracking-wider text-base font-mono transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        />
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1.5 font-mono">
                        Слово скрыто от ведущего. За успешный контакт вы получите <strong>+10 очков</strong>.
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
                        className="px-4 py-3 rounded-xl bg-[#060818] hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/[0.1] text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Нет идей? Пропустить
                      </button>

                      <button
                        type="submit"
                        disabled={!intendedWord.trim() || isSubmitting}
                        className="px-7 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-blue-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.5)] border border-cyan-300/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Загадать слово 🎙️</span>
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* Another player's turn to speak */
                <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden specular-border border border-cyan-400/30 shadow-[0_0_35px_rgba(6,182,212,0.18)]">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center mx-auto mb-3 shadow-[0_0_18px_rgba(6,182,212,0.3)]">
                    <Mic className="w-7 h-7 animate-pulse text-cyan-300" />
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-white mb-1 tracking-tight">
                    Очередь игрока: <span className="text-cyan-300 drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">{activePlayerName}</span>
                  </h4>
                  {room.turnExpiresAt && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#060818] border border-cyan-400/30 text-xs font-mono text-cyan-200 my-2 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
                      <Clock className={`w-3.5 h-3.5 ${turnSecondsLeft <= 3 ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`} />
                      <span>
                        Осталось времени на ход:{' '}
                        <strong className={turnSecondsLeft <= 3 ? 'text-rose-300 font-bold' : 'text-cyan-300 font-bold'}>
                          {turnSecondsLeft} сек
                        </strong>
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-zinc-300 max-w-md mx-auto mb-1 leading-relaxed">
                    Слушайте намёк в Discord / голосовом чате. Если игрок не загадает слово за 20 секунд, ход автоматически перейдёт к следующему.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Direct Guess entire word shortcut */}
          <div className="flex justify-end">
            <button
              onClick={onOpenDirectGuess}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2.5 transition-all cursor-pointer ${
                remainingCooldownSec > 0
                  ? 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-gradient-to-r from-violet-600/30 via-fuchsia-600/30 to-pink-600/30 hover:from-violet-500/45 hover:to-fuchsia-500/45 text-fuchsia-200 hover:text-white border border-fuchsia-400/50 hover:border-fuchsia-300 shadow-[0_0_25px_rgba(236,72,153,0.35)] active:scale-95'
              }`}
            >
              <KeyRound className={`w-4 h-4 ${remainingCooldownSec > 0 ? 'text-amber-400' : 'text-fuchsia-400 drop-shadow-[0_0_6px_#ec4899]'}`} />
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
