import React from 'react';
import { Sparkles, Eye, ShieldCheck } from 'lucide-react';
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
    <div className="w-full glass-panel rounded-2xl p-4 sm:p-6 shadow-2xl border border-white/[0.08] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-32 bg-blue-600/[0.06] blur-3xl pointer-events-none rounded-full" />

      <div className="flex flex-col items-center">
        {/* Top Info Bar */}
        <div className="flex items-center justify-between w-full mb-4 px-1 text-xs sm:text-sm text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>
              Слово из <strong className="text-white font-mono font-bold">{totalLetters}</strong> букв
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-zinc-900/90 border border-zinc-800 font-mono text-zinc-300 text-xs">
              Открыто {isGameOver ? totalLetters : revealedLettersCount} из {totalLetters}
            </span>

            {isHost && !isGameOver && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-lg bg-amber-950/30 text-amber-300 border border-amber-500/30 font-medium">
                <Eye className="w-3 h-3 text-amber-400" />
                Видно только ведущему
              </span>
            )}
          </div>
        </div>

        {/* Word Tiles Grid */}
        <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3 py-2 max-w-full">
          {secretWord.split('').map((letter, index) => {
            const isRevealed = index < revealedLettersCount || isGameOver;

            if (isRevealed) {
              return (
                <div
                  key={index}
                  className="w-11 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-xl bg-gradient-to-b from-zinc-800 via-zinc-850 to-zinc-900 text-white font-mono font-black text-2xl sm:text-3xl md:text-4xl flex items-center justify-center shadow-xl shadow-black/80 border border-white/15 border-t-white/30 transform transition-all duration-300 hover:scale-[1.03] select-none ring-1 ring-blue-500/20"
                >
                  {letter}
                </div>
              );
            }

            // Hidden letter - what host sees vs what player sees
            if (isHost) {
              return (
                <div
                  key={index}
                  title="Эту букву видите только вы"
                  className="w-11 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-xl bg-zinc-900/90 text-amber-300/80 font-mono font-bold text-2xl sm:text-3xl md:text-4xl flex flex-col items-center justify-center shadow-inner border border-dashed border-amber-500/40 transition-all select-none relative group"
                >
                  <span>{letter}</span>
                  <span className="text-[9px] text-amber-400/60 font-sans tracking-tight font-normal absolute bottom-1">
                    скрыто
                  </span>
                </div>
              );
            }

            // Player unrevealed mystery card
            return (
              <div
                key={index}
                className="w-11 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-xl bg-zinc-950/90 text-zinc-600 font-mono font-bold text-xl sm:text-2xl flex items-center justify-center shadow-inner border border-zinc-850 transition-all select-none relative"
              >
                <span className="text-zinc-600 animate-pulse font-mono">•</span>
                <span className="absolute text-[10px] text-zinc-650 top-1 right-1.5 font-mono">
                  {index + 1}
                </span>
              </div>
            );
          })}
        </div>

        {/* Prefix Hint Bar */}
        <div className="mt-4 text-center">
          <p className="text-xs text-zinc-400">
            Все намёки, ассоциации и отбития начинаются на:{' '}
            <span className="font-bold text-blue-300 bg-zinc-900/90 px-2.5 py-0.5 rounded-lg border border-zinc-800 text-sm font-mono ml-1">
              {secretWord.slice(0, revealedLettersCount)}...
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
