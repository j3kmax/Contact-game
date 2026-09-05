import React, { useState, useEffect, useRef } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { sounds } from '../services/sound';

interface TimerProps {
  timerExpiresAt: number;
  onExpired: () => void;
  isHost?: boolean;
}

export const Timer: React.FC<TimerProps> = ({ timerExpiresAt, onExpired, isHost = false }) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const remaining = Math.max(0, Math.ceil((timerExpiresAt - Date.now()) / 1000));
    return remaining;
  });

  const expiredTriggered = useRef(false);
  const lastSecondTicked = useRef<number | null>(null);

  useEffect(() => {
    expiredTriggered.current = false;

    const interval = setInterval(() => {
      const remainingMs = timerExpiresAt - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

      setSecondsLeft(remainingSec);

      // Audio tick on each remaining second, more urgent for last 3 seconds
      if (remainingSec > 0 && remainingSec !== lastSecondTicked.current) {
        lastSecondTicked.current = remainingSec;
        sounds.playTick(remainingSec <= 3);
      }

      // Check expiry
      if (remainingMs <= 0 && !expiredTriggered.current) {
        expiredTriggered.current = true;
        clearInterval(interval);
        onExpired();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timerExpiresAt, onExpired]);

  const percentage = Math.min(100, Math.max(0, (secondsLeft / 10) * 100));
  const isUrgent = secondsLeft <= 3;

  return (
    <div
      className={`w-full rounded-2xl p-4 sm:p-5 border transition-all duration-300 ${
        isHost
          ? 'bg-gradient-to-r from-red-950/80 via-rose-900/60 to-red-950/80 border-rose-600/50 shadow-lg shadow-rose-950/50 animate-pulse-fast'
          : 'bg-gradient-to-r from-indigo-950/80 via-purple-900/40 to-indigo-950/80 border-indigo-500/40 shadow-lg shadow-indigo-950/50'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-2xl font-mono shadow-inner ${
              isUrgent
                ? 'bg-rose-600 text-white animate-bounce-short'
                : 'bg-indigo-600 text-white'
            }`}
          >
            {secondsLeft}
          </div>

          <div>
            <div className="flex items-center gap-2">
              {isHost ? (
                <AlertTriangle className="w-5 h-5 text-rose-400 animate-wiggle" />
              ) : (
                <Clock className="w-5 h-5 text-indigo-400" />
              )}
              <h3 className="font-bold text-base sm:text-lg text-white">
                {isHost ? 'ВНИМАНИЕ: ОБЪЯВЛЕН КОНТАКТ!' : 'ИДЕТ ОТСЧЕТ 10 СЕКУНД!'}
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              {isHost
                ? 'У вас есть секунды, чтобы ввести «Это не...» и сбить контакт!'
                : 'Ждём: успеет ли ведущий отгадать ассоциацию?'}
            </p>
          </div>
        </div>

        {/* Circular / Progress Indicator */}
        <div className="w-full sm:w-48 bg-slate-900/80 rounded-full h-3.5 p-0.5 border border-slate-700/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              isUrgent ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
