import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RotateCcw, Award } from 'lucide-react';
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

  const isHost = currentUser?.role === 'host';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-panel-glow rounded-3xl p-6 sm:p-8 text-center border border-amber-500/40 shadow-2xl relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/20 blur-2xl rounded-full pointer-events-none" />

        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 p-4 shadow-xl shadow-amber-500/30 mb-5 animate-bounce-short">
          <Trophy className="w-full h-full stroke-[2.5]" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
          ПОБЕДА ИГРОКОВ!
        </h2>
        <p className="text-sm text-slate-300 mb-6">
          Тайное слово было полностью разгадано!
        </p>

        {/* Word Display in Gold */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 mb-6">
          <span className="text-xs uppercase tracking-widest text-amber-400/80 font-bold block mb-1">
            Загаданное слово:
          </span>
          <div className="text-3xl sm:text-4xl font-black text-amber-300 tracking-widest uppercase font-mono">
            {room.secretWord}
          </div>
        </div>

        {/* Restart Action */}
        {isHost ? (
          <button
            onClick={() => onRestart()}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transform transition-all active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Начать новую игру</span>
          </button>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Ожидаем, когда ведущий запустит следующий раунд...</span>
          </div>
        )}
      </div>
    </div>
  );
};
