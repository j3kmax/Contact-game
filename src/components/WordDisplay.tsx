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
    <div className="w-full glass-panel rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800/80 relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-32 bg-indigo-600/15 blur-3xl pointer-events-none rounded-full" />

      <div className="flex flex-col items-center">
        {/* Top Info Bar */}
        <div className="flex items-center justify-between w-full mb-4 px-1 text-xs sm:text-sm text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>
              Слово из <strong className="text-white font-semibold">{totalLetters}</strong> букв
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700/60 font-medium text-slate-300 text-xs">
              Открыто {isGameOver ? totalLetters : revealedLettersCount} из {totalLetters}
            </span>

            {isHost && !isGameOver && (
              <span className="hidden sm:flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/40">
                <Eye className="w-3 h-3" />
                Слово видно только вам
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
                  className="w-11 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-xl bg-gradient-to-b from-indigo-500 via-indigo-600 to-indigo-800 text-white font-bold text-2xl sm:text-3xl md:text-4xl flex items-center justify-center shadow-lg shadow-indigo-500/25 border-t border-indigo-400/50 transform transition-all duration-300 hover:scale-105 select-none"
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
                  className="w-11 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-xl bg-slate-800/80 text-amber-300/80 font-bold text-2xl sm:text-3xl md:text-4xl flex flex-col items-center justify-center shadow-inner border border-dashed border-amber-500/40 transition-all select-none relative group"
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
                className="w-11 h-14 sm:w-14 sm:h-18 md:w-16 md:h-20 rounded-xl bg-slate-900/90 text-slate-500 font-bold text-xl sm:text-2xl flex items-center justify-center shadow-inner border border-slate-800 transition-all select-none relative"
              >
                <span className="text-slate-600 animate-pulse font-mono">•</span>
                <span className="absolute text-[10px] text-slate-600 top-1 right-1.5 font-mono">
                  {index + 1}
                </span>
              </div>
            );
          })}
        </div>

        {/* Prefix Hint Bar */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-400">
            Все намёки, ассоциации и отбития должны начинаться на:{' '}
            <span className="font-bold text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-700/50 text-sm">
              {secretWord.slice(0, revealedLettersCount)}...
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};
