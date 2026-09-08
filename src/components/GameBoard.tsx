import React, { useState } from 'react';
import { Room, Player } from '../types/game';
import { WordDisplay } from './WordDisplay';
import { ActionPanel } from './ActionPanel';
import { HistoryLog } from './HistoryLog';
import { DirectGuessModal } from './DirectGuessModal';
import { GameOverModal } from './GameOverModal';
import { Crown, Gamepad2, Users, Target, UserMinus, ArrowRightCircle } from 'lucide-react';

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
            onOpenDirectGuess={() => setIsDirectGuessOpen(true)}
          />
        </div>

        {/* Right 1 col: Players list & History Feed */}
        <div className="flex flex-col gap-4">
          {/* Active Players Widget */}
          <div className="glass-panel-elevated rounded-3xl p-4 sm:p-5 relative overflow-hidden specular-border">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
                  Гравці в раунді ({playersList.length})
                </h4>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">Турнірні бали</span>
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
                        ? 'bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-blue-950/40 border-blue-500/60 shadow-[0_0_18px_-4px_rgba(59,130,246,0.3)] text-blue-100 ring-1 ring-blue-400/40'
                        : isPlayerLeader
                        ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                        : isPlayerHost
                        ? 'bg-[#07090e]/90 border-amber-500/25 text-zinc-200'
                        : isMe
                        ? 'bg-[#07090e]/90 border-white/[0.14] text-white'
                        : 'bg-[#07090e]/60 border-white/[0.06] text-zinc-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      {isPlayerHost ? (
                        <span title="Хост кімнати" className="flex items-center">
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        </span>
                      ) : isPlayerLeader ? (
                        <span title="Ведучий" className="flex items-center">
                          <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        </span>
                      ) : (
                        <Gamepad2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      )}

                      <span className="font-bold truncate max-w-[110px]">
                        {p.name} {isMe && '(Ви)'}
                      </span>

                      {/* Status indicator tags */}
                      {isTurnPlayer && (
                        <span className="text-[10px] text-blue-400 font-extrabold uppercase tracking-wide bg-blue-500/15 px-1.5 py-0.5 rounded border border-blue-500/30">
                          Ходить
                        </span>
                      )}
                      {isQuestionAuthor && (
                        <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa] shrink-0" title="Автор намёку" />
                      )}
                      {isContactPartner && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" title="Оголосив Контакт" />
                      )}
                      {isAdditionalPartner && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" title="Підтримав Контакт" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Pass turn to this player */}
                      {onPassTurnTo && !isPlayerLeader && !isTurnPlayer && !room.currentQuestion && (
                        <button
                          type="button"
                          onClick={() => onPassTurnTo(p.id)}
                          className="px-2 py-0.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 hover:text-white border border-blue-500/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm hover:border-blue-400 active:scale-95"
                          title={`Передати чергу ходу гравцю ${p.name}`}
                        >
                          <ArrowRightCircle className="w-3 h-3 text-blue-400" />
                          <span>Дати хід</span>
                        </button>
                      )}

                      {/* Score Badge */}
                      <span className="px-2 py-0.5 rounded-lg bg-[#07090e] text-[11px] font-mono font-bold text-amber-300 border border-amber-500/30 shadow-inner" title="Баллы">
                        {p.score || 0}
                      </span>

                      {/* In-game Host kick action */}
                      {isLobbyHost && !isMe && onKickPlayer && (
                        <button
                          type="button"
                          onClick={() => onKickPlayer(p.id)}
                          className="p-1 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Виключити гравця"
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
