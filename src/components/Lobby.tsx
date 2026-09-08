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
      {/* Welcome & Room Card */}
      <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 relative overflow-hidden text-center specular-border">
        <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-b from-blue-600/20 via-zinc-900 to-[#07090e] border border-blue-500/30 text-blue-400 mb-3 shadow-xl shadow-blue-950/40 ring-1 ring-blue-400/20">
          <Sparkles className="w-6 h-6 text-blue-400" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Комната <span className="text-blue-400 font-mono tracking-wider">#{roomId}</span>
        </h2>
        <p className="text-sm text-zinc-400 max-w-md mx-auto mt-2 leading-relaxed font-medium">
          Поделитесь этой ссылкой с участниками в Discord. Начинайте партию, когда все готовы.
        </p>

        {/* Share Link Button */}
        <div className="mt-5 inline-flex items-center gap-2 p-1.5 bg-[#07090e] rounded-2xl border border-white/[0.08] max-w-full shadow-inner">
          <span className="text-xs text-zinc-400 font-mono px-3.5 truncate max-w-[200px] sm:max-w-xs select-all">
            {window.location.origin}#room={roomId}
          </span>
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-blue-950/50 border border-blue-400/20 cursor-pointer active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Скопировано!' : 'Копировать'}</span>
          </button>
        </div>
      </div>

      {/* Step 1: Join Form if not yet joined */}
      {!isJoined ? (
        <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 specular-border">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span>Вход в лобби игры</span>
          </h3>

          <form onSubmit={handleJoin} className="flex flex-col gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 font-mono">
                Ваше игровое имя
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите свой никнейм..."
                className="w-full px-4 py-3.5 rounded-2xl bg-[#07090e] text-white placeholder-zinc-600 border border-white/[0.09] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-base font-semibold transition-colors shadow-inner"
              />
            </div>

            {(!room || !room.hostId) && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2 font-mono">
                  Статус комнаты
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('host')}
                    className="p-4 rounded-2xl border text-left bg-[#07090e] border-amber-500/40 shadow-lg shadow-black/40 cursor-pointer group hover:border-amber-400/60 transition-all"
                  >
                    <div className="flex items-center gap-2.5 mb-1">
                      <Crown className="w-5 h-5 text-amber-400" />
                      <span className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                        Хост комнаты и ведущий первого раунда
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      Полный контроль комнаты: назначение ведущих, передача прав, исключение игроков и старт игры.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs text-rose-300 flex items-center gap-2 p-3 bg-rose-950/40 rounded-2xl border border-rose-900/50">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-base shadow-xl shadow-blue-950/50 border border-blue-400/20 transition-all disabled:opacity-40 cursor-pointer active:scale-[0.99]"
            >
              Войти в комнату
            </button>
          </form>
        </div>
      ) : isLeader ? (
        /* Step 2A: Round Leader start form (Enter Secret Word) */
        <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-xl specular-border relative overflow-hidden">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Target className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white">Вы ведущий: загадайте тайное слово</h3>
          </div>
          <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
            Существительное в именительном падеже (например: <strong>АВТОМОБИЛЬ</strong>, <strong>ФОТОГРАФИЯ</strong>). Игрокам откроется только первая буква!
          </p>

          <form onSubmit={handleStart} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5 font-mono">
                Секретное слово
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
                className="w-full px-4 py-4 rounded-2xl bg-[#07090e] text-amber-300 placeholder-zinc-700 border border-white/[0.09] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-2xl font-black tracking-widest uppercase font-mono text-center transition-colors shadow-inner"
              />
              <p className="text-[11px] text-zinc-500 mt-1.5 text-center font-mono">
                Не менее 3 символов • Только буквы
              </p>
            </div>

            {error && (
              <div className="text-xs text-rose-300 flex items-center gap-2 p-3 bg-rose-950/40 rounded-2xl border border-rose-900/50">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={secretWord.trim().length < 3 || isSubmitting}
              className="w-full py-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20 border border-amber-400/40 flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer active:scale-[0.99]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Начать игру</span>
            </button>
          </form>
        </div>
      ) : (
        /* Step 2B: Player waiting view */
        <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 text-center specular-border">
          <div className="inline-flex p-4 rounded-2xl bg-[#07090e] text-blue-400 border border-white/[0.08] mb-3 shadow-inner">
            <Gamepad2 className="w-8 h-8 animate-pulse text-blue-400" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-white mb-1 tracking-tight">
            Вы в лобби, {currentUser.name}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            Ожидаем, пока ведущий <strong className="text-white font-semibold">{currentLeaderName}</strong> загадает тайное слово и начнёт раунд...
          </p>
        </div>
      )}

      {/* Connected Players List & Host Administration */}
      <div className="glass-panel-elevated rounded-3xl p-5 sm:p-7 specular-border">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
              Участники ({playersList.length})
            </h4>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">Баллы сохраняются между раундами</span>
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
                  isPlayerLeader
                    ? 'bg-blue-950/20 border-blue-500/30'
                    : isPlayerHost
                    ? 'bg-amber-950/20 border-amber-500/25'
                    : isMe
                    ? 'bg-[#07090e]/90 border-white/[0.12]'
                    : 'bg-[#07090e]/60 border-white/[0.06]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-inner ${
                      isPlayerLeader
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : isPlayerHost
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-zinc-800 text-zinc-300 border border-white/[0.08]'
                    }`}
                  >
                    {isPlayerLeader ? (
                      <Target className="w-4 h-4" />
                    ) : isPlayerHost ? (
                      <Crown className="w-4 h-4" />
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
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                          <Crown className="w-3 h-3" /> Хост
                        </span>
                      )}
                      {isPlayerLeader && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-mono">
                          <Target className="w-3 h-3" /> Ведущий
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 font-mono">
                      Баллы: <strong className="text-amber-300">{p.score || 0}</strong>
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
                        className="px-3 py-1.5 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 text-blue-200 border border-blue-700/40 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                        title="Назначить ведущим на этот раунд"
                      >
                        <Target className="w-3 h-3 text-blue-400" />
                        <span>Ведущий</span>
                      </button>
                    )}
                    {onTransferLobbyHost && (
                      <button
                        type="button"
                        onClick={() => onTransferLobbyHost(p.id)}
                        className="px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 border border-amber-700/40 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
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
                        className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
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
