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
      className={`w-full rounded-3xl p-4 sm:p-5 border transition-all duration-300 relative overflow-hidden specular-border shadow-2xl ${
        isHost
          ? 'bg-[#12080d]/95 border-rose-500/50 shadow-[0_0_35px_-5px_rgba(244,63,94,0.25)]'
          : 'bg-[#0b0f1c]/95 border-blue-500/40 shadow-[0_0_35px_-5px_rgba(37,99,235,0.2)]'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-13 h-13 rounded-2xl flex items-center justify-center font-bold text-2xl sm:text-3xl font-mono border transition-all shadow-inner select-none ${
              isUrgent
                ? 'bg-rose-950/70 border-rose-500 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse'
                : 'bg-[#07090e] border-white/[0.1] text-blue-400'
            }`}
          >
            {secondsLeft}s
          </div>

          <div>
            <div className="flex items-center gap-2">
              {isHost ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
              ) : (
                <Clock className="w-4 h-4 text-blue-400 animate-spin" />
              )}
              <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                {isHost ? 'ВНИМАНИЕ: ОБЪЯВЛЕН КОНТАКТ!' : 'ИДЕТ ОБРАТНЫЙ ОТСЧЕТ 10 СЕКУНД'}
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 font-medium">
              {isHost
                ? 'У вас есть считанные секунды, чтобы ввести «Это не...» и сбить контакт!'
                : 'Ожидаем: успеет ли ведущий отгадать ассоциацию?'}
            </p>
          </div>
        </div>

        {/* High Precision Progress Track */}
        <div className="w-full sm:w-52 bg-[#07090e] rounded-full h-3 p-0.5 border border-white/[0.09] overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              isUrgent
                ? 'bg-rose-500 shadow-[0_0_12px_#f43f5e]'
                : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 shadow-[0_0_12px_#3b82f6]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
