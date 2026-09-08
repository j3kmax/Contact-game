import React, { useState } from 'react';
import { Crown, Gamepad2, Play, Users, Copy, Check, Sparkles, AlertCircle, UserMinus, Target, RefreshCw, Dices, CheckCircle2 } from 'lucide-react';
import { Room, Player, PlayerRole } from '../types/game';
import { sounds } from '../services/sound';
import { getRandomWords } from '../data/words';

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
  const [wordSuggestions, setWordSuggestions] = useState<string[]>(() => getRandomWords(5));
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRefreshSuggestions = () => {
    const nextWords = getRandomWords(5, wordSuggestions);
    setWordSuggestions(nextWords);
    sounds.playPop();
  };

  const handleSelectWord = (word: string) => {
    setSecretWord(word);
    setError(null);
    sounds.playPop();
  };

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
        <div className="inline-flex p-3.5 rounded-2xl bg-gradient-to-b from-emerald-500/25 via-emerald-900/30 to-[#041a11] border border-emerald-500/40 text-emerald-400 mb-3 shadow-xl shadow-emerald-950/40 ring-1 ring-emerald-400/20">
          <Sparkles className="w-6 h-6 text-emerald-400" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Комната <span className="text-emerald-400 font-mono tracking-wider drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]">#{roomId}</span>
        </h2>
        <p className="text-sm text-zinc-300 max-w-md mx-auto mt-2 leading-relaxed font-medium">
          Поделитесь этой ссылкой с участниками в Discord. Начинайте партию, когда все готовы.
        </p>

        {/* Share Link Button */}
        <div className="mt-5 inline-flex items-center gap-2 p-1.5 bg-[#061e14] rounded-2xl border border-emerald-500/25 max-w-full shadow-inner">
          <span className="text-xs text-zinc-300 font-mono px-3.5 truncate max-w-[200px] sm:max-w-xs select-all">
            {window.location.origin}#room={roomId}
          </span>
          <button
            onClick={handleCopy}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/50 border border-emerald-300/50 cursor-pointer active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-950" /> : <Copy className="w-3.5 h-3.5" />}
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
                className="w-full px-4 py-3.5 rounded-2xl bg-[#061e14] text-white placeholder-zinc-600 border border-white/[0.12] focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 text-base font-semibold transition-colors shadow-inner"
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
                    className="p-4 rounded-2xl border text-left bg-[#062015] border-amber-500/40 shadow-lg shadow-black/40 cursor-pointer group hover:border-amber-400/60 transition-all"
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
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 text-slate-950 font-black text-base shadow-[0_0_30px_rgba(16,185,129,0.45)] border border-emerald-300/50 transition-all disabled:opacity-40 cursor-pointer active:scale-[0.99]"
            >
              Войти в комнату
            </button>
          </form>
        </div>
      ) : isLeader ? (
        /* Step 2A: Round Leader start form (Enter or Select Secret Word) */
        <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 border border-emerald-400/40 shadow-[0_0_40px_rgba(16,185,129,0.25)] specular-border relative overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500/25 to-lime-500/25 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-white">Вы ведущий: загадайте тайное слово</h3>
            </div>
            <button
              type="button"
              onClick={handleRefreshSuggestions}
              className="px-3 py-1.5 rounded-xl bg-[#061e14] hover:bg-[#0a2f20] text-emerald-300 hover:text-emerald-200 border border-emerald-400/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.15)] cursor-pointer active:scale-95"
              title="Получить 5 других случайных слов"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              <span>Другие варианты</span>
            </button>
          </div>

          <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
            Выберите одно из 5 предложенных проверенных существительных (без ошибок и опечаток) или введите своё:
          </p>

          {/* 5 Suggested Words Grid */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 font-mono flex items-center gap-1.5">
                <Dices className="w-3.5 h-3.5 text-emerald-400" />
                Случайные варианты на выбор:
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">Нажмите для выбора</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {wordSuggestions.map((w) => {
                const isSelected = secretWord === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => handleSelectWord(w)}
                    className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500/25 to-lime-500/25 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400/50 shadow-[0_0_24px_rgba(16,185,129,0.4)]'
                        : 'bg-[#061e14]/90 hover:bg-[#0a2f20] border-white/[0.12] hover:border-emerald-400/50 text-white shadow-inner'
                    }`}
                  >
                    <div>
                      <div className="font-mono font-black text-sm sm:text-base tracking-wider">
                        {w}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        {w.length} букв
                      </div>
                    </div>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 drop-shadow-[0_0_6px_#10b981]" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleStart} className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 font-mono">
                  Выбранное секретное слово
                </label>
                {secretWord && (
                  <span className="text-[11px] text-emerald-300 font-mono font-bold">
                    Первая буква: «<strong className="text-emerald-200 font-black">{secretWord[0]}</strong>»
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={secretWord}
                onChange={(e) => {
                  setSecretWord(e.target.value.toUpperCase());
                  setError(null);
                }}
                placeholder="ВЫБЕРИТЕ ИЛИ ВВЕДИТЕ СЛОВО..."
                className="w-full px-4 py-3.5 rounded-2xl bg-[#061e14] text-emerald-200 placeholder-zinc-700 border border-emerald-400/40 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/50 text-xl sm:text-2xl font-black tracking-widest uppercase font-mono text-center transition-all shadow-[0_0_20px_rgba(16,185,129,0.15)]"
              />
              <p className="text-[11px] text-zinc-400 mt-1.5 text-center font-mono">
                Игрокам откроется только первая буква • От 3 букв
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
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 text-slate-950 font-black text-lg shadow-[0_0_35px_rgba(16,185,129,0.6)] border border-emerald-300/80 flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer active:scale-[0.99]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Начать игру с этим словом</span>
            </button>
          </form>
        </div>
      ) : (
        /* Step 2B: Player waiting view */
        <div className="glass-panel-elevated rounded-3xl p-6 sm:p-8 text-center specular-border">
          <div className="inline-flex p-4 rounded-2xl bg-[#061e14] text-emerald-400 border border-emerald-400/30 mb-3 shadow-inner">
            <Gamepad2 className="w-8 h-8 animate-pulse text-emerald-400" />
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
            <Users className="w-4 h-4 text-emerald-400" />
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
                    ? 'bg-emerald-950/35 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                    : isPlayerHost
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : isMe
                    ? 'bg-[#082a1c]/90 border-emerald-400/30'
                    : 'bg-[#051810]/70 border-white/[0.08]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 shadow-inner ${
                      isPlayerLeader
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isPlayerHost
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-[#072418] text-emerald-200 border border-white/[0.08]'
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
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                          <Crown className="w-3 h-3" /> Хост
                        </span>
                      )}
                      {isPlayerLeader && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-mono">
                          <Target className="w-3 h-3" /> Ведущий
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 font-mono">
                      Баллы: <strong className="text-emerald-300">{p.score || 0}</strong>
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
                        className="px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 border border-emerald-700/40 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                        title="Назначить ведущим на этот раунд"
                      >
                        <Target className="w-3 h-3 text-emerald-400" />
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
