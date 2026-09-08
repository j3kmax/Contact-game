import React from 'react';
import { Sparkles, Eye } from 'lucide-react';
import { PlayerRole } from '../types/game';

interface WordDisplayProps {
  secretWord: string;
  revealedLettersCount: number;
  userRole: PlayerRole | null;
  isGameOver?: boolean;
}

export const WordDisplay: React.FC<WordDisplayProps> = ({
  secretWord,
  revealedLettersCount,
  userRole,
  isGameOver = false,
}) => {
  if (!secretWord) return null;

  const totalLetters = secretWord.length;
  const isHost = userRole === 'host';

  return (
    <div className="w-full glass-panel-elevated rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden specular-border">
      {/* Hyper-vibrant Cyber-Emerald ambient lighting */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[550px] h-48 bg-gradient-to-r from-emerald-500/35 via-teal-500/25 to-lime-500/30 blur-3xl pointer-events-none rounded-full" />

      <div className="flex flex-col items-center relative z-10">
        {/* Top Info Bar */}
        <div className="flex items-center justify-between w-full mb-5 px-1 text-xs sm:text-sm text-emerald-100/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500/25 to-lime-500/25 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-semibold text-emerald-100">
              Слово из <strong className="text-white font-mono font-black text-sm drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">{totalLetters}</strong> букв
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-[#062015]/90 border border-emerald-400/35 font-mono text-emerald-200 text-xs shadow-[0_0_12px_rgba(16,185,129,0.2)] font-bold">
              Открыто {isGameOver ? totalLetters : revealedLettersCount} из {totalLetters}
            </span>

            {isHost && !isGameOver && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/25 to-yellow-500/25 text-amber-200 border border-amber-400/50 font-bold shadow-[0_0_14px_rgba(245,158,11,0.25)]">
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                Видно только ведущему
              </span>
            )}
          </div>
        </div>

        {/* Word Tiles Grid - Hyper-Luminescent Emerald Crystal Gem Style */}
        <div className="flex flex-wrap justify-center items-center gap-2.5 sm:gap-3.5 py-2 max-w-full">
          {secretWord.split('').map((letter, index) => {
            const isRevealed = index < revealedLettersCount || isGameOver;

            if (isRevealed) {
              return (
                <div
                  key={index}
                  className="w-11 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-2xl bg-gradient-to-b from-[#0e3b26] via-[#08281a] to-[#04160d] font-mono font-black text-2xl sm:text-3xl md:text-4xl flex flex-col items-center justify-center shadow-[0_0_32px_rgba(16,185,129,0.55),0_15px_30px_rgba(0,0,0,0.85)] border border-emerald-400/70 border-t-emerald-300/90 transform transition-all duration-200 hover:scale-[1.06] select-none relative group"
                >
                  {/* Specular prismatic sheen */}
                  <span className="absolute top-0 inset-x-2 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-200 to-transparent shadow-[0_0_8px_#34d399]" />
                  <span className="leading-none bg-gradient-to-b from-white via-emerald-100 to-lime-200 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(52,211,153,0.85)]">
                    {letter}
                  </span>
                  {/* Bottom illuminated status dot */}
                  <span className="w-2 h-2 rounded-full bg-lime-400 shadow-[0_0_12px_#a3e635] absolute bottom-1.5" />
                </div>
              );
            }

            // Hidden letter - what host sees vs what player sees
            if (isHost) {
              return (
                <div
                  key={index}
                  title="Эту букву видите только вы"
                  className="w-11 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-2xl bg-gradient-to-b from-amber-950/40 via-[#1f1a0a] to-[#0d0c04] text-amber-200 font-mono font-black text-2xl sm:text-3xl md:text-4xl flex flex-col items-center justify-center shadow-[0_0_25px_rgba(245,158,11,0.4)] border border-dashed border-amber-400/70 transition-all select-none relative group hover:scale-[1.04]"
                >
                  <span className="drop-shadow-[0_0_10px_rgba(245,158,11,0.7)]">{letter}</span>
                  <span className="text-[9px] text-amber-300 font-sans tracking-tight uppercase font-extrabold absolute bottom-1">
                    скрыто
                  </span>
                </div>
              );
            }

            // Player unrevealed mystery card
            return (
              <div
                key={index}
                className="w-11 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-2xl bg-gradient-to-b from-[#082217]/90 to-[#04140d]/95 text-emerald-400/40 font-mono font-bold text-xl sm:text-2xl flex flex-col items-center justify-center shadow-inner border border-emerald-500/20 hover:border-emerald-400/50 transition-all select-none relative"
              >
                <div className="w-3.5 h-1 bg-emerald-400/30 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
                <span className="absolute text-[10px] text-emerald-400/50 top-1.5 right-2 font-mono font-medium">
                  {index + 1}
                </span>
              </div>
            );
          })}
        </div>

        {/* Prefix Mission Hint Bar */}
        <div className="mt-5 text-center">
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-[#062417]/80 to-teal-950/40 border border-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.25)] text-xs text-emerald-100">
            <span className="font-medium">Все намёки и слова начинаются на:</span>
            <span className="font-mono font-black text-sm text-lime-300 bg-emerald-500/25 border border-emerald-400/60 px-3 py-0.5 rounded-xl tracking-wider shadow-[0_0_16px_rgba(16,185,129,0.45)]">
              {secretWord.slice(0, revealedLettersCount)}...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
