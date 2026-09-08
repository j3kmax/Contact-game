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
    const colors = ['#10b981', '#34d399', '#a3e635', '#f59e0b', '#6ee7b7'];

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
  const isHostOrLeader = currentUser?.id === room.hostId || currentUser?.id === effectiveLeaderId;
  const playersList = Object.values(room.players || {}).sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="w-full max-w-lg glass-panel-elevated rounded-3xl p-6 sm:p-8 text-center border border-emerald-400/50 bg-[#061e14]/95 shadow-[0_0_60px_rgba(16,185,129,0.35),0_20px_50px_rgba(0,0,0,0.85)] relative my-auto specular-border">
        {/* Subtle ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-emerald-500/15 blur-3xl rounded-full pointer-events-none" />

        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500/25 to-emerald-500/25 border border-amber-400/50 text-amber-300 p-3.5 shadow-xl shadow-amber-500/20 mb-4">
          <Trophy className="w-full h-full stroke-[2.2] drop-shadow-[0_0_8px_#f59e0b]" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2 bg-gradient-to-r from-emerald-300 via-teal-200 to-lime-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]">
          ПОБЕДА ИГРОКОВ!
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 mb-5">
          Тайное слово было полностью разгадано!
        </p>

        {/* Word Display in Emerald & Gold */}
        <div className="p-4 rounded-2xl bg-[#04160d] border border-emerald-400/40 shadow-inner mb-5">
          <span className="text-[11px] uppercase tracking-widest text-emerald-400/80 font-bold block mb-1 font-mono">
            Загаданное слово:
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-200 tracking-widest uppercase font-mono drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]">
            {room.secretWord}
          </div>
        </div>

        {/* Tournament Leaderboard / Ranking */}
        <div className="mb-6 text-left">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Medal className="w-3.5 h-3.5 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-mono">
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
                      ? 'bg-gradient-to-r from-amber-500/20 to-emerald-500/20 border-amber-400/60 text-amber-100 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : isMe
                      ? 'bg-[#082b1d]/90 border-emerald-400/40 text-emerald-100'
                      : 'bg-[#04160d]/90 border-white/[0.08] text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                        idx === 0
                          ? 'bg-amber-400 text-slate-950 shadow-[0_0_8px_#f59e0b]'
                          : idx === 1
                          ? 'bg-emerald-300 text-slate-950'
                          : idx === 2
                          ? 'bg-lime-400 text-slate-950'
                          : 'bg-[#072518] text-emerald-400 font-mono border border-emerald-500/20'
                      }`}
                    >
                      {idx + 1}
                    </span>

                    <span className="font-semibold">
                      {p.name} {isMe && '(Вы)'} {p.id === room.hostId ? '👑' : p.id === effectiveLeaderId ? '🎯' : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono font-bold">
                    {isWinner && <Crown className="w-3.5 h-3.5 text-amber-400 drop-shadow-[0_0_4px_#f59e0b]" />}
                    <span className="text-emerald-300 text-sm">{p.score || 0}</span>
                    <span className="text-zinc-500 text-[10px]">очков</span>
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
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 text-slate-950 font-black text-base shadow-[0_0_30px_rgba(16,185,129,0.5)] border border-emerald-300/60 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Начать следующий раунд (баллы сохраняются)</span>
          </button>
        ) : (
          <div className="p-3.5 rounded-xl bg-[#04160d] border border-emerald-500/20 text-xs text-zinc-400 flex items-center justify-center gap-2">
            <Award className="w-4 h-4 text-emerald-400" />
            <span>Ожидаем, когда хост или ведущий запустит следующий раунд...</span>
          </div>
        )}
      </div>
    </div>
  );
};
