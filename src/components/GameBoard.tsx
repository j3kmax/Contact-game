import React, { useState } from 'react';
import { Room, Player } from '../types/game';
import { WordDisplay } from './WordDisplay';
import { ActionPanel } from './ActionPanel';
import { HistoryLog } from './HistoryLog';
import { DirectGuessModal } from './DirectGuessModal';
import { GameOverModal } from './GameOverModal';
import { Crown, Gamepad2, Users, Target, UserMinus } from 'lucide-react';

interface GameBoardProps {
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
          <div className="glass-panel rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Игроки в раунде ({playersList.length})
                </h4>
              </div>
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
                    className={`px-3 py-2 rounded-xl border text-xs flex items-center justify-between transition-all ${
                      isPlayerLeader
                        ? 'bg-purple-950/40 border-purple-600/30 text-purple-200'
                        : isPlayerHost
                        ? 'bg-amber-950/40 border-amber-600/30 text-amber-200'
                        : isTurnPlayer
                        ? 'bg-gradient-to-r from-indigo-950/90 to-purple-950/90 border-indigo-400 shadow-md shadow-indigo-500/20 text-indigo-200 ring-1 ring-indigo-400/50'
                        : isMe
                        ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-200'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {isPlayerHost ? (
                        <span title="Хост комнаты" className="flex items-center">
                          <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        </span>
                      ) : isPlayerLeader ? (
                        <span title="Ведущий" className="flex items-center">
                          <Target className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        </span>
                      ) : (
                        <Gamepad2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      )}

                      <span className="font-semibold truncate max-w-[110px]">
                        {p.name} {isMe && '(Вы)'}
                      </span>

                      {/* Status indicator tags */}
                      {isTurnPlayer && (
                        <span className="text-[10px] text-indigo-300 font-bold">Ходит</span>
                      )}
                      {isQuestionAuthor && (
                        <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" title="Автор вопроса" />
                      )}
                      {isContactPartner && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" title="Объявил Контакт" />
                      )}
                      {isAdditionalPartner && (
                        <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" title="Поддержал Контакт" />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Score Badge */}
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-mono font-bold text-amber-300 border border-amber-500/20" title="Баллы">
                        {p.score || 0}
                      </span>

                      {/* In-game Host kick action */}
                      {isLobbyHost && !isMe && onKickPlayer && (
                        <button
                          type="button"
                          onClick={() => onKickPlayer(p.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          title="Исключить игрока"
                        >
                          <UserMinus className="w-3 h-3" />
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
