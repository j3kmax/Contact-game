import React, { useState, useEffect } from 'react';
import { Room, Player } from '../types/game';
import { WordDisplay } from './WordDisplay';
import { ActionPanel } from './ActionPanel';
import { HistoryLog } from './HistoryLog';
import { DirectGuessModal } from './DirectGuessModal';
import { GameOverModal } from './GameOverModal';
import { Crown, Gamepad2, Users, Target, UserMinus, ArrowRightCircle, Clock } from 'lucide-react';

interface GameBoardProps {
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
  onDirectGuess: (word: string) => Promise<{ correct: boolean; message: string }>;
  onRestartGame: () => Promise<void>;
  onKickPlayer?: (playerId: string) => Promise<void>;
  onTransferLobbyHost?: (newHostId: string) => Promise<void>;
}

export const GameBoard: React.FC<GameBoardProps> = ({
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
  onDirectGuess,
  onRestartGame,
  onKickPlayer,
  onTransferLobbyHost,
}) => {
  const [isDirectGuessOpen, setIsDirectGuessOpen] = useState(false);

  const isGameOver = room.status === 'GAME_OVER';
  const playersList = Object.values(room.players || {});
  const effectiveLeaderId = room.leaderId || room.hostId;
  const isLobbyHost = currentUser.id === room.hostId;

  // Turn ticker for real-time display in player list
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!room.turnExpiresAt || room.currentQuestion || room.status !== 'QUESTION_PHASE') return;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [room.turnExpiresAt, room.currentQuestion, room.status]);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col gap-6 py-2 sm:py-4">
      {/* 1. Main Word Display */}
      <WordDisplay
        secretWord={room.secretWord}
        revealedLettersCount={room.revealedLettersCount}
        userRole={currentUser.id === effectiveLeaderId ? 'host' : 'player'}
        isGameOver={isGameOver}
      />

      {/* 2. Grid Layout: Action Panel on left, Log & Players on right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 cols: Interactive Game Center */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <ActionPanel
            room={room}
            currentUser={currentUser}
            onAskQuestion={onAskQuestion}
            onCancelQuestion={onCancelQuestion}
            onSkipTurn={onSkipTurn}
            onPassTurnTo={onPassTurnTo}
            onDeclareContact={onDeclareContact}
            onJoinContact={onJoinContact}
            onHostGiveUp={onHostGiveUp}
            onDeflect={onDeflect}
            onAcceptDeflect={onAcceptDeflect}
            onTimerExpired={onTimerExpired}
            onTurnTimeout={onTurnTimeout}
            onOpenDirectGuess={() => setIsDirectGuessOpen(true)}
          />
        </div>

        {/* Right 1 col: Players list & History Feed */}
        <div className="flex flex-col gap-4">
          {/* Active Players Widget */}
          <div className="glass-panel-elevated rounded-3xl p-4 sm:p-5 relative overflow-hidden specular-border">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-100 font-mono">
                  Игроки в раунде ({playersList.length})
                </h4>
              </div>
              <span className="text-[10px] text-emerald-400/60 font-mono">Турнирные баллы</span>
            </div>

            <div className="flex flex-col gap-2">
              {playersList.map((p) => {
                const isMe = p.id === currentUser.id;
                const isPlayerHost = p.id === room.hostId;
                const isPlayerLeader = p.id === effectiveLeaderId;
                const isQuestionAuthor = room.currentQuestion?.authorId === p.id;
                const isContactPartner = room.contactData?.partnerId === p.id;
                const isAdditionalPartner = room.contactData?.additionalPartners?.some((ap) => ap.id === p.id);
                const isTurnPlayer = room.activePlayerId === p.id && !room.currentQuestion;

                return (
                  <div
                    key={p.id}
                    className={`px-3.5 py-2.5 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                      isTurnPlayer
                        ? 'bg-gradient-to-r from-emerald-950/70 via-teal-950/60 to-emerald-950/70 border-emerald-400/70 shadow-[0_0_24px_rgba(16,185,129,0.45)] text-emerald-100 ring-1 ring-emerald-400/50 animate-pulse-subtle'
                        : isPlayerLeader
                        ? 'bg-gradient-to-r from-teal-950/40 via-emerald-950/40 to-teal-950/40 border-emerald-400/50 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.25)]'
                        : isPlayerHost
                        ? 'bg-[#072518]/90 border-amber-400/40 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : isMe
                        ? 'bg-[#0a3120]/95 border-emerald-400/35 text-white shadow-inner'
                        : 'bg-[#04160e]/80 border-white/[0.08] text-emerald-100/70 hover:border-emerald-400/30'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {isPlayerHost ? (
                        <span title="Хост комнаты" className="flex items-center">
                          <Crown className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.7)] shrink-0" />
                        </span>
                      ) : isPlayerLeader ? (
                        <span title="Ведущий" className="flex items-center">
                          <Target className="w-3.5 h-3.5 text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.7)] shrink-0" />
                        </span>
                      ) : (
                        <Gamepad2 className="w-3.5 h-3.5 text-emerald-400/60 shrink-0" />
                      )}

                      <span className="font-bold truncate max-w-[110px]">
                        {p.name} {isMe && '(Вы)'}
                      </span>

                      {/* Status indicator tags */}
                      {isTurnPlayer && (
                        <span className="text-[10px] text-emerald-200 font-extrabold uppercase tracking-wide bg-emerald-500/25 px-2 py-0.5 rounded-lg border border-emerald-400/50 shadow-[0_0_10px_rgba(16,185,129,0.35)] flex items-center gap-1">
                          <span>Ходит</span>
                          {room.turnExpiresAt && (
                            <span className="font-mono text-lime-300 font-bold">
                              {Math.max(0, Math.ceil((room.turnExpiresAt - now) / 1000))}с
                            </span>
                          )}
                        </span>
                      )}
                      {isQuestionAuthor && (
                        <span className="w-2.5 h-2.5 rounded-full bg-lime-400 shadow-[0_0_10px_#a3e635] shrink-0" title="Автор намёка" />
                      )}
                      {isContactPartner && (
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-ping shrink-0" title="Объявил Контакт" />
                      )}
                      {isAdditionalPartner && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] shrink-0" title="Поддержал Контакт" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Pass turn to this player (Host only) */}
                      {isLobbyHost && onPassTurnTo && !isPlayerLeader && !isTurnPlayer && !room.currentQuestion && (
                        <button
                          type="button"
                          onClick={() => onPassTurnTo(p.id)}
                          className="px-2 py-1 rounded-xl bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-500/45 hover:to-teal-500/45 text-emerald-200 hover:text-white border border-emerald-400/45 hover:border-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.25)] active:scale-95"
                          title={`Передать очередь хода игроку ${p.name}`}
                        >
                          <ArrowRightCircle className="w-3 h-3 text-emerald-300" />
                          <span>Дать ход</span>
                        </button>
                      )}

                      {/* Score Badge */}
                      <span className="px-2.5 py-0.5 rounded-xl bg-[#04160e] text-[11px] font-mono font-bold text-lime-300 border border-emerald-400/40 shadow-[0_0_10px_rgba(163,230,53,0.2)]" title="Баллы">
                        {p.score || 0}
                      </span>

                      {/* In-game Host transfer action */}
                      {isLobbyHost && !isMe && onTransferLobbyHost && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Передать права хоста комнаты игроку ${p.name}?`)) {
                              onTransferLobbyHost(p.id);
                            }
                          }}
                          className="p-1.5 rounded-xl text-amber-400 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/30 border border-amber-400/35 hover:border-amber-400/75 shadow-[0_0_12px_rgba(245,158,11,0.3)] transition-all cursor-pointer active:scale-90"
                          title={`Передать права хоста комнаты игроку ${p.name}`}
                        >
                          <Crown className="w-3.5 h-3.5 fill-amber-400/20" />
                        </button>
                      )}

                      {/* In-game Host kick action */}
                      {isLobbyHost && !isMe && onKickPlayer && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Исключить игрока ${p.name} из комнаты?`)) {
                              onKickPlayer(p.id);
                            }
                          }}
                          className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-300 hover:bg-rose-500/20 border border-transparent hover:border-rose-500/40 transition-all cursor-pointer active:scale-90"
                          title="Исключить игрока"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* History Event Log */}
          <HistoryLog history={room.historyLog} />
        </div>
      </div>

      <DirectGuessModal
        isOpen={isDirectGuessOpen}
        onClose={() => setIsDirectGuessOpen(false)}
        onDirectGuess={onDirectGuess}
        cooldownUntil={room.directGuessCooldowns?.[currentUser.id] || 0}
      />

      {isGameOver && (
        <GameOverModal
          room={room}
          currentUser={currentUser}
          onRestart={onRestartGame}
        />
      )}
    </div>
  );
};
