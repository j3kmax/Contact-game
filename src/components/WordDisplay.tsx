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
      {/* Background ambient lighting */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-40 bg-blue-600/[0.08] blur-3xl pointer-events-none rounded-full" />

      <div className="flex flex-col items-center relative z-10">
        {/* Top Info Bar */}
        <div className="flex items-center justify-between w-full mb-5 px-1 text-xs sm:text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium">
              Слово из <strong className="text-white font-mono font-bold">{totalLetters}</strong> букв
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-[#07090e]/90 border border-white/[0.08] font-mono text-zinc-300 text-xs shadow-inner">
              Открыто {isGameOver ? totalLetters : revealedLettersCount} из {totalLetters}
            </span>

            {isHost && !isGameOver && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-xl bg-amber-950/25 text-amber-300 border border-amber-500/30 font-semibold shadow-inner">
                <Eye className="w-3 h-3 text-amber-400" />
                Видно только ведущему
              </span>
            )}
          </div>
        </div>

        {/* Word Tiles Grid */}
        <div className="flex flex-wrap justify-center items-center gap-2.5 sm:gap-3.5 py-2 max-w-full">
          {secretWord.split('').map((letter, index) => {
            const isRevealed = index < revealedLettersCount || isGameOver;

            if (isRevealed) {
              return (
                <div
                  key={index}
                  className="w-11 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-2xl bg-gradient-to-b from-[#192237] via-[#101624] to-[#0a0e18] text-white font-mono font-black text-2xl sm:text-3xl md:text-4xl flex flex-col items-center justify-center shadow-[0_10px_25px_-5px_rgba(0,0,0,0.8),0_0_20px_-5px_rgba(59,130,246,0.3)] border border-blue-500/30 border-t-blue-400/50 transform transition-all duration-200 hover:scale-[1.04] select-none relative group"
                >
                  {/* Subtle top specular sheen */}
                  <span className="absolute top-0 inset-x-2 h-[1px] bg-gradient-to-r from-transparent via-blue-300/40 to-transparent" />
                  <span className="leading-none drop-shadow-[0_2px_8px_rgba(59,130,246,0.5)]">{letter}</span>
                  {/* Bottom illuminated status dot */}
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_#60a5fa] absolute bottom-1.5 opacity-80" />
                </div>
              );
            }

            // Hidden letter - what host sees vs what player sees
            if (isHost) {
              return (
                <div
                  key={index}
                  title="Эту букву видите только вы"
                  className="w-11 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-2xl bg-gradient-to-b from-amber-950/25 via-[#131110] to-[#0a0a0b] text-amber-300 font-mono font-bold text-2xl sm:text-3xl md:text-4xl flex flex-col items-center justify-center shadow-inner border border-dashed border-amber-500/40 transition-all select-none relative group hover:border-amber-400/60"
                >
                  <span className="opacity-90">{letter}</span>
                  <span className="text-[9px] text-amber-400/70 font-sans tracking-tight uppercase font-semibold absolute bottom-1">
                    скрыто
                  </span>
                </div>
              );
            }

            // Player unrevealed mystery card
            return (
              <div
                key={index}
                className="w-11 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-2xl bg-[#080b13] text-zinc-600 font-mono font-bold text-xl sm:text-2xl flex flex-col items-center justify-center shadow-inner border border-white/[0.05] transition-all select-none relative hover:border-white/[0.1]"
              >
                <div className="w-3 h-0.5 bg-zinc-700/60 rounded-full" />
                <span className="absolute text-[10px] text-zinc-600 top-1.5 right-2 font-mono font-medium">
                  {index + 1}
                </span>
              </div>
            );
          })}
        </div>

        {/* Prefix Mission Hint Bar */}
        <div className="mt-5 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#07090e]/90 border border-white/[0.07] shadow-inner text-xs text-zinc-400">
            <span>Все намёки и слова начинаются на:</span>
            <span className="font-mono font-black text-sm text-blue-300 bg-blue-500/15 border border-blue-500/30 px-2.5 py-0.5 rounded-lg tracking-wider shadow-[0_0_12px_rgba(59,130,246,0.25)]">
              {secretWord.slice(0, revealedLettersCount)}...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
