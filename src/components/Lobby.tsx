import React, { useState } from 'react';
import { Crown, Gamepad2, Play, Users, Copy, Check, Sparkles, AlertCircle, UserMinus, Target } from 'lucide-react';
import { Room, Player, PlayerRole } from '../types/game';
import { sounds } from '../services/sound';

interface LobbyProps {
  room: Room | null;
  currentUser: Player | null;
  roomId: string;
  onJoin: (name: string, role?: PlayerRole) => Promise<void>;
  onStartGame: (secretWord: string) => Promise<void>;
  onKickPlayer?: (playerId: string) => Promise<void>;
  onTransferLobbyHost?: (newHostId: string) => Promise<void>;
  onSetRoundLeader?: (leaderId: string) => Promise<void>;
}

export function Lobby({
  room,
  currentUser,
  roomId,
  onJoin,
  onStartGame,
  onKickPlayer,
  onTransferLobbyHost,
  onSetRoundLeader,
}: LobbyProps) {
  const [name, setName] = useState(currentUser?.name || '');
  const [selectedRole, setSelectedRole] = useState<PlayerRole>(currentUser?.role || 'player');
  const [secretWord, setSecretWord] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const playersList = room?.players ? Object.values(room.players) : [];
  const effectiveLeaderId = room?.leaderId || room?.hostId;
  const isJoined = !!currentUser && !!room?.players?.[currentUser.id];
  const isLobbyHost = !!room?.hostId && currentUser?.id === room.hostId;
  const isLeader = !!currentUser && (currentUser.id === effectiveLeaderId || (!room?.leaderId && isLobbyHost));
  const currentLeaderName = (effectiveLeaderId && room?.players?.[effectiveLeaderId]?.name) || 'Ведущий';

  const handleCopy = () => {
    const url = `${window.location.origin}${window.location.pathname}#room=${roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    sounds.playPop();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setError(null);
    try {
      setIsSubmitting(true);
      await onJoin(name.trim(), selectedRole);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка входа');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretWord.trim() || isSubmitting) return;

    setError(null);
    try {
      setIsSubmitting(true);
      await onStartGame(secretWord.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ошибка запуска');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6 py-4 animate-fade-in">
      {/* Welcome Card */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-indigo-500/30 shadow-2xl relative overflow-hidden text-center">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="inline-flex p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 mb-3 shadow-lg shadow-indigo-500/20">
          <Sparkles className="w-8 h-8" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
          Комната <span className="text-indigo-400">#{roomId}</span>
        </h2>
        <p className="text-sm text-slate-300 max-w-md mx-auto mt-2">
          Пригласите друзей по ссылке, выберите роли и начинайте интеллектуальную битву!
        </p>

        {/* Share Link Button */}
        <div className="mt-5 inline-flex items-center gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 max-w-full">
          <span className="text-xs text-slate-400 font-mono px-3 truncate max-w-[200px] sm:max-w-xs">
            {window.location.origin}#room={roomId}
          </span>
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/30"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Скопировано!' : 'Скопировать ссылку'}</span>
          </button>
        </div>
      </div>

      {/* Step 1: Join Form if not yet joined */}
      {!isJoined ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>Вход в игру</span>
          </h3>

          <form onSubmit={handleJoin} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Ваше имя
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Как вас зовут?"
                className="w-full px-4 py-3.5 rounded-2xl bg-slate-900/90 text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-base font-semibold"
              />
            </div>

            {(!room || !room.hostId) && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Роль (вы создатель комнаты)
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('host')}
                    className="p-4 rounded-2xl border text-left bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 mb-1">
                      <Crown className="w-5 h-5 text-amber-400" />
                      <span className="font-bold text-sm text-white">Хост лобби и ведущий первого раунда</span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Вы сможете начинать раунды, исключать игроков, передавать хоста и назначать ведущих.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-rose-400 flex items-center gap-1.5 p-2 bg-rose-950/30 rounded-xl border border-rose-900/50">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-xl shadow-indigo-600/30 transition-all disabled:opacity-50"
            >
              Войти в комнату
            </button>
          </form>
        </div>
      ) : isLeader ? (
        /* Step 2A: Round Leader start form (Enter Secret Word) */
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/40 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-6 h-6 text-amber-400" />
            <h3 className="text-xl font-bold text-white">Вы ведущий: загадайте слово</h3>
          </div>
          <p className="text-xs text-slate-300 mb-5">
            Придумайте существительное в именительном падеже (например: <strong>КОМПЬЮТЕР</strong>, <strong>ОДУВАНЧИК</strong>). Игроки увидят только первую букву!
          </p>

          <form onSubmit={handleStart} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Тайное слово
              </label>
              <input
                type="text"
                required
                value={secretWord}
                onChange={(e) => {
                  setSecretWord(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="ВВЕДИТЕ СЛОВО..."
                className="w-full px-4 py-4 rounded-2xl bg-slate-900 text-amber-300 placeholder-slate-600 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500 text-2xl font-black tracking-widest uppercase font-mono text-center"
              />
              <p className="text-[11px] text-slate-400 mt-1 text-center">
                Только русские буквы, не менее 3 символов
              </p>
            </div>

            {error && (
              <div className="text-xs text-rose-400 flex items-center gap-1.5 p-2 bg-rose-950/30 rounded-xl border border-rose-900/50">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={secretWord.trim().length < 3 || isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Начать игру!</span>
            </button>
          </form>
        </div>
      ) : (
        /* Step 2B: Player waiting view */
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-800 text-center">
          <div className="inline-flex p-4 rounded-full bg-slate-900 text-indigo-400 mb-3 animate-pulse">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">
            Вы в лобби, {currentUser.name}!
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Ожидаем, пока ведущий <strong className="text-amber-300 font-semibold">{currentLeaderName}</strong> загадает тайное слово и запустит раунд...
          </p>
        </div>
      )}

      {/* Connected Players List & Host Administration */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Игроки в лобби ({playersList.length})
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">Баллы сохраняются между раундами</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {playersList.map((p) => {
            const isPlayerHost = p.id === room?.hostId;
            const isPlayerLeader = p.id === effectiveLeaderId;
            const isMe = p.id === currentUser?.id;

            return (
              <div
                key={p.id}
                className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  isPlayerHost
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : isPlayerLeader
                    ? 'bg-purple-950/20 border-purple-500/30'
                    : isMe
                    ? 'bg-indigo-950/20 border-indigo-500/30'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      isPlayerHost
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : isPlayerLeader
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}
                  >
                    {isPlayerHost ? (
                      <Crown className="w-4 h-4" />
                    ) : isPlayerLeader ? (
                      <Target className="w-4 h-4" />
                    ) : (
                      <Gamepad2 className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">
                        {p.name} {isMe && '(Вы)'}
                      </span>
                      {isPlayerHost && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Crown className="w-3 h-3" /> Хост
                        </span>
                      )}
                      {isPlayerLeader && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Target className="w-3 h-3" /> Ведущий
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Накопленный счёт: <strong className="text-amber-300 font-mono">{p.score || 0}</strong> очков
                    </div>
                  </div>
                </div>

                {/* Host Controls for other players */}
                {isLobbyHost && !isMe && (
                  <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                    {!isPlayerLeader && onSetRoundLeader && (
                      <button
                        type="button"
                        onClick={() => onSetRoundLeader(p.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/80 text-purple-200 border border-purple-700/50 text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                        title="Назначить ведущим на этот раунд"
                      >
                        <Target className="w-3 h-3 text-purple-400" />
                        <span>Назначить ведущим</span>
                      </button>
                    )}
                    {onTransferLobbyHost && (
                      <button
                        type="button"
                        onClick={() => onTransferLobbyHost(p.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 text-amber-200 border border-amber-700/50 text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                        title="Передать права хоста комнаты"
                      >
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span>Сделать хостом</span>
                      </button>
                    )}
                    {onKickPlayer && (
                      <button
                        type="button"
                        onClick={() => onKickPlayer(p.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/50 text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm"
                        title="Исключить игрока из лобби"
                      >
                        <UserMinus className="w-3 h-3" />
                        <span>Исключить</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
