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
  const onExpiredRef = useRef(onExpired);

  useEffect(() => {
    onExpiredRef.current = onExpired;
  }, [onExpired]);

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
        onExpiredRef.current();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [timerExpiresAt]);

  const percentage = Math.min(100, Math.max(0, (secondsLeft / 10) * 100));
  const isUrgent = secondsLeft <= 3;

  return (
    <div
      className={`w-full rounded-2xl p-4 sm:p-5 border transition-all duration-300 ${
        isHost
          ? 'bg-[#140b0f]/90 border-rose-600/40 shadow-xl shadow-rose-950/30'
          : 'bg-[#0d111c]/90 border-slate-800 shadow-xl shadow-black/40'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-2xl font-mono border transition-all ${
              isUrgent
                ? 'bg-rose-950/60 border-rose-500/60 text-rose-300 shadow-lg shadow-rose-950/50'
                : 'bg-[#090b10] border-slate-800 text-blue-400 shadow-inner'
            }`}
          >
            {secondsLeft}
          </div>

          <div>
            <div className="flex items-center gap-2">
              {isHost ? (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              ) : (
                <Clock className="w-4 h-4 text-blue-400" />
              )}
              <h3 className="font-bold text-sm sm:text-base text-white tracking-tight">
                {isHost ? 'ВНИМАНИЕ: ОБЪЯВЛЕН КОНТАКТ!' : 'ИДЕТ ОТСЧЕТ 10 СЕКУНД'}
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isHost
                ? 'У вас есть секунды, чтобы ввести «Это не...» и сбить контакт!'
                : 'Ждём: успеет ли ведущий отгадать ассоциацию?'}
            </p>
          </div>
        </div>

        {/* Precision Progress Indicator */}
        <div className="w-full sm:w-48 bg-[#090b10] rounded-full h-2.5 p-0.5 border border-slate-800/90 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              isUrgent ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-600 to-indigo-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
