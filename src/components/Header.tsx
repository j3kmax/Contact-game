import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, HelpCircle, Users, Gamepad2 } from 'lucide-react';
import { Player, Room } from '../types/game';
import { sounds } from '../services/sound';

interface HeaderProps {
  room: Room | null;
  currentUser: Player | null;
  onOpenSettings?: () => void;
  onOpenRules: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  room,
  currentUser,
  onOpenSettings,
  onOpenRules,
}) => {
  const [copied, setCopied] = useState(false);
  const [isMuted, setIsMuted] = useState(sounds.getMuted());

  const handleCopyLink = () => {
    if (!room) return;
    const url = `${window.location.origin}${window.location.pathname}#room=${room.roomId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    sounds.playPop();
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleAudio = () => {
    const nextState = sounds.toggleMute();
    setIsMuted(nextState);
    if (!nextState) sounds.playPop();
  };

  const playerCount = room?.players ? Object.keys(room.players).length : 0;

  return (
    <header className="sticky top-2 z-30 w-full px-3 sm:px-6">
      <div className="max-w-7xl mx-auto rounded-2xl bg-gradient-to-r from-[#072418]/90 via-[#03150d]/95 to-[#072418]/90 backdrop-blur-2xl border border-emerald-500/25 px-4 py-2.5 sm:px-6 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_30px_rgba(16,185,129,0.25)] specular-border flex items-center justify-between gap-3 transition-all">
        {/* Brand Logo & Tag */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500/30 via-teal-500/30 to-lime-500/30 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.45)] shrink-0">
            <Gamepad2 className="w-5 h-5 text-emerald-300 drop-shadow-[0_0_6px_#34d399]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wider flex items-center gap-1">
                <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-lime-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(52,211,153,0.7)]">
                  КОНТАКТ
                </span>
                <span className="text-lime-400 text-xl leading-none drop-shadow-[0_0_10px_rgba(163,230,53,0.8)]">!</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-md bg-gradient-to-r from-emerald-500/20 to-lime-500/20 text-emerald-200 border border-emerald-400/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-emerald-300/60 font-medium hidden sm:block">
              Словесная интеллектуальная игра
            </p>
          </div>
        </div>

        {/* Room Info & Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {room && (
            <>
              {/* Room Code Badge */}
              <button
                onClick={handleCopyLink}
                title="Нажмите, чтобы скопировать ссылку на комнату"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#061e14]/90 hover:bg-[#0b3322] text-emerald-100 text-xs font-mono border border-emerald-500/35 hover:border-emerald-400/70 shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all group cursor-pointer active:scale-95"
              >
                <span className="text-emerald-400/60 text-[11px] font-sans font-medium">Код:</span>
                <span className="font-bold tracking-wider text-white group-hover:text-lime-300 transition-colors">{room.roomId}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-emerald-400/60 group-hover:text-lime-300 ml-0.5 transition-colors" />
                )}
              </button>

              {/* Player Count */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#061e14]/85 border border-emerald-500/20 text-lime-300 text-xs font-mono shadow-inner">
                <Users className="w-3.5 h-3.5 text-lime-400" />
                <span className="font-bold">{playerCount}</span>
              </div>

              {/* Current Role Badge */}
              {currentUser && (
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shadow-sm ${
                    currentUser.id === (room?.leaderId || room?.hostId)
                      ? 'bg-gradient-to-r from-emerald-500/25 to-teal-500/30 text-emerald-200 border-emerald-400/50 shadow-[0_0_16px_rgba(16,185,129,0.3)]'
                      : currentUser.id === room?.hostId
                      ? 'bg-gradient-to-r from-amber-500/20 to-yellow-500/25 text-amber-200 border-amber-400/45 shadow-[0_0_14px_rgba(245,158,11,0.25)]'
                      : 'bg-[#061e14]/90 text-emerald-200 border-emerald-400/35 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                  }`}
                >
                  <span className="font-medium">
                    {currentUser.id === (room?.leaderId || room?.hostId)
                      ? '🎯 Ведущий'
                      : currentUser.id === room?.hostId
                      ? '👑 Хост'
                      : '🎮 Игрок'}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Audio Mute Button */}
          <button
            onClick={toggleAudio}
            className="p-2 rounded-xl bg-[#061e14]/85 hover:bg-[#0b3322] text-emerald-300/70 hover:text-white border border-emerald-500/20 hover:border-emerald-400/40 transition-all cursor-pointer"
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-emerald-700" /> : <Volume2 className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_6px_#34d399]" />}
          </button>

          {/* Rules Button */}
          <button
            onClick={onOpenRules}
            className="p-2 rounded-xl bg-[#061e14]/85 hover:bg-[#0b3322] text-emerald-300/70 hover:text-white border border-emerald-500/20 hover:border-emerald-400/40 transition-all cursor-pointer"
            title="Правила игры"
          >
            <HelpCircle className="w-4 h-4 text-emerald-300" />
          </button>
        </div>
      </div>
    </header>
  );
};
