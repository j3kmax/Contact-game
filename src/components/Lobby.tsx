import React, { useState } from 'react';
import { Crown, Gamepad2, Play, Users, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';
import { Room, Player, PlayerRole } from '../types/game';
import { sounds } from '../services/sound';

interface LobbyProps {
  room: Room | null;
  currentUser: Player | null;
  roomId: string;
  onJoin: (name: string, role: PlayerRole) => Promise<void>;
  onStartGame: (secretWord: string) => Promise<void>;
}

export function Lobby({ room, currentUser, roomId, onJoin, onStartGame }: LobbyProps) {
  const [name, setName] = useState(currentUser?.name || '');
  const [selectedRole, setSelectedRole] = useState<PlayerRole>(currentUser?.role || 'player');
  const [secretWord, setSecretWord] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const playersList = room?.players ? Object.values(room.players) : [];
  const hasHostAlready = playersList.some((p) => p.role === 'host' && p.id !== currentUser?.id);

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

  const isJoined = !!currentUser && !!room?.players?.[currentUser.id];
  const isHost = currentUser?.role === 'host';

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
          Пригласите друзей по ссылке, выберите роль и начинайте интеллектуальную битву!
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

            {/* Role Choice */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Выберите роль
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Host Option */}
                <button
                  type="button"
                  disabled={hasHostAlready}
                  onClick={() => setSelectedRole('host')}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    selectedRole === 'host'
                      ? 'bg-amber-950/40 border-amber-500 shadow-lg shadow-amber-950/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  } ${hasHostAlready ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <Crown
                      className={`w-5 h-5 ${
                        selectedRole === 'host' ? 'text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="font-bold text-sm text-white">Ведущий</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    {hasHostAlready
                      ? 'Ведущий в комнате уже есть'
                      : 'Загадывает тайное слово и пытается отбивать намёки игроков.'}
                  </p>
                </button>

                {/* Player Option */}
                <button
                  type="button"
                  onClick={() => setSelectedRole('player')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedRole === 'player'
                      ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-950/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 mb-1">
                    <Gamepad2
                      className={`w-5 h-5 ${
                        selectedRole === 'player' ? 'text-indigo-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="font-bold text-sm text-white">Игрок</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Задает хитрые намёки, нажимает «Контакт!» и открывает буквы.
                  </p>
                </button>
              </div>
            </div>

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
      ) : isHost ? (
        /* Step 2A: Host start form (Enter Secret Word) */
        <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-amber-500/40 shadow-xl">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="w-6 h-6 text-amber-400" />
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
            Вы в игре, {currentUser.name}!
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Ожидаем, пока ведущий загадает тайное слово и запустит партию...
          </p>
        </div>
      )}

      {/* Connected Players List */}
      <div className="glass-panel rounded-3xl p-5 border border-slate-800">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Игроки в лобби ({playersList.length})
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">Для веселой игры нужно от 3 человек</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {playersList.map((p) => (
            <div
              key={p.id}
              className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center gap-2.5"
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                  p.role === 'host'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                }`}
              >
                {p.role === 'host' ? <Crown className="w-4 h-4" /> : <Gamepad2 className="w-4 h-4" />}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">{p.name}</div>
                <div className="text-[10px] text-slate-400 capitalize">
                  {p.role === 'host' ? 'Ведущий' : 'Игрок'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
