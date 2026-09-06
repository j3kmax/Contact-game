import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Award, Crown, Medal } from 'lucide-react';
import { Room, Player } from '../types/game';

interface GameOverModalProps {
  room: Room;
  currentUser: Player | null;
  onRestart: () => Promise<void>;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  room,
  currentUser,
  onRestart,
}) => {
  useEffect(() => {
    // Launch celebratory confetti burst
    const end = Date.now() + 3 * 1000;
    const colors = ['#6366f1', '#a855f7', '#ec4899', '#10b981', '#f59e0b'];

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  const effectiveLeaderId = room.leaderId || room.hostId;
  const isHostOrLeader = currentUser?.id === room.hostId || currentUser?.id === effectiveLeaderId || currentUser?.role === 'host';
  const playersList = Object.values(room.players || {}).sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg glass-panel-glow rounded-3xl p-6 sm:p-8 text-center border border-amber-500/40 shadow-2xl relative my-auto">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/20 blur-2xl rounded-full pointer-events-none" />

        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 p-4 shadow-xl shadow-amber-500/30 mb-4 animate-bounce-short">
          <Trophy className="w-full h-full stroke-[2.5]" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
          ПОБЕДА ИГРОКОВ!
        </h2>
        <p className="text-sm text-slate-300 mb-5">
          Тайное слово было полностью разгадано!
        </p>

        {/* Word Display in Gold */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 mb-5">
          <span className="text-xs uppercase tracking-widest text-amber-400/80 font-bold block mb-1">
            Загаданное слово:
          </span>
          <div className="text-3xl sm:text-4xl font-black text-amber-300 tracking-widest uppercase font-mono">
            {room.secretWord}
          </div>
        </div>

        {/* Tournament Leaderboard / Ranking */}
        <div className="mb-6 text-left">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Medal className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Таблица лидеров (Баллы раунда)
            </h4>
          </div>

          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {playersList.map((p, idx) => {
              const isWinner = idx === 0 && (p.score || 0) > 0;
              const isMe = p.id === currentUser?.id;

              return (
                <div
                  key={p.id}
                  className={`px-3.5 py-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                    isWinner
                      ? 'bg-gradient-to-r from-amber-950/60 to-yellow-950/40 border-amber-500/50 text-amber-200'
                      : isMe
                      ? 'bg-indigo-950/50 border-indigo-500/40 text-indigo-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-950'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <span className="font-semibold">
                      {p.name} {isMe && '(Вы)'} {p.id === room.hostId ? '👑' : p.id === effectiveLeaderId ? '🎯' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono font-bold">
                    {isWinner && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                    <span className="text-amber-300 text-sm">{p.score || 0}</span>
                    <span className="text-slate-400 text-[10px]">очков</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Restart Action */}
        {isHostOrLeader ? (
          <button
            onClick={() => onRestart()}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transform transition-all active:scale-95 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Начать следующий раунд (баллы сохраняются)</span>
          </button>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Ожидаем, когда хост или ведущий запустит следующий раунд...</span>
          </div>
        )}
      </div>
    </div>
  );
};
