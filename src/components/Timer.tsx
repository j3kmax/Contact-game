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
          ? 'bg-gradient-to-r from-rose-950/60 via-[#1c0b16]/90 to-rose-950/60 border-rose-500/60 shadow-[0_0_40px_rgba(244,63,94,0.4)]'
          : 'bg-gradient-to-r from-cyan-950/50 via-[#0d1330]/90 to-blue-950/50 border-cyan-400/50 shadow-[0_0_40px_rgba(6,182,212,0.35)]'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-3.5">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl sm:text-3xl font-mono border transition-all select-none ${
              isUrgent
                ? 'bg-rose-950/80 border-rose-400 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.7)] animate-pulse'
                : 'bg-[#060918] border-cyan-400/50 text-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.4)]'
            }`}
          >
            {secondsLeft}s
          </div>

          <div>
            <div className="flex items-center gap-2">
              {isHost ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
              ) : (
                <Clock className="w-4 h-4 text-cyan-400 animate-spin" />
              )}
              <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                {isHost ? 'ВНИМАНИЕ: ОБЪЯВЛЕН КОНТАКТ!' : 'ИДЕТ ОБРАТНЫЙ ОТСЧЕТ 10 СЕКУНД'}
              </h3>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5 font-medium">
              {isHost
                ? 'У вас есть считанные секунды, чтобы ввести «Это не...» и сбить контакт!'
                : 'Ожидаем: успеет ли ведущий отгадать ассоциацию?'}
            </p>
          </div>
        </div>

        {/* High Precision Progress Track */}
        <div className="w-full sm:w-52 bg-[#060918] rounded-full h-3.5 p-0.5 border border-white/[0.12] overflow-hidden shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              isUrgent
                ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400 shadow-[0_0_18px_#f43f5e]'
                : 'bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 shadow-[0_0_16px_#22d3ee]'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};
