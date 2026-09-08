import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, Settings, HelpCircle, Users, Flame, Gamepad2 } from 'lucide-react';
import { Player, Room } from '../types/game';
import { sounds } from '../services/sound';
import { isFirebaseConfigured } from '../config/firebase';

interface HeaderProps {
  room: Room | null;
  currentUser: Player | null;
  onOpenSettings: () => void;
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
  const isFirebaseActive = isFirebaseConfigured();

  return (
    <header className="sticky top-2 z-30 w-full px-3 sm:px-6">
      <div className="max-w-7xl mx-auto rounded-2xl bg-gradient-to-r from-[#220d36]/90 via-[#150724]/95 to-[#220d36]/90 backdrop-blur-2xl border border-white/[0.14] px-4 py-2.5 sm:px-6 shadow-[0_12px_40px_rgba(0,0,0,0.85),0_0_30px_rgba(244,63,94,0.25)] specular-border flex items-center justify-between gap-3 transition-all">
        {/* Brand Logo & Tag */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500/30 via-orange-500/30 to-amber-500/30 border border-rose-400/50 flex items-center justify-center text-rose-300 shadow-[0_0_18px_rgba(244,63,94,0.45)] shrink-0">
            <Gamepad2 className="w-5 h-5 text-rose-300 drop-shadow-[0_0_6px_#fb7185]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wider flex items-center gap-1">
                <span className="bg-gradient-to-r from-rose-400 via-orange-300 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(251,113,133,0.7)]">
                  КОНТАКТ
                </span>
                <span className="text-amber-400 text-xl leading-none drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]">!</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-md bg-gradient-to-r from-rose-500/20 to-amber-500/20 text-rose-200 border border-rose-400/40 shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-rose-200/60 font-medium hidden sm:block">
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
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#170928]/90 hover:bg-[#250e40] text-rose-100 text-xs font-mono border border-rose-400/35 hover:border-rose-400/70 shadow-[0_0_12px_rgba(244,63,94,0.2)] transition-all group cursor-pointer active:scale-95"
              >
                <span className="text-rose-400/60 text-[11px] font-sans font-medium">Код:</span>
                <span className="font-bold tracking-wider text-white group-hover:text-amber-300 transition-colors">{room.roomId}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-rose-400/60 group-hover:text-amber-300 ml-0.5 transition-colors" />
                )}
              </button>

              {/* Player Count */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#170928]/85 border border-white/[0.1] text-amber-300 text-xs font-mono shadow-inner">
                <Users className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold">{playerCount}</span>
              </div>

              {/* Current Role Badge */}
              {currentUser && (
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shadow-sm ${
                    currentUser.id === (room?.leaderId || room?.hostId)
                      ? 'bg-gradient-to-r from-amber-500/25 to-yellow-500/30 text-amber-200 border-amber-400/50 shadow-[0_0_16px_rgba(245,158,11,0.3)]'
                      : currentUser.id === room?.hostId
                      ? 'bg-gradient-to-r from-rose-500/20 to-orange-500/25 text-rose-200 border-rose-400/45 shadow-[0_0_14px_rgba(244,63,94,0.25)]'
                      : 'bg-[#170928]/90 text-rose-200 border-rose-400/35 shadow-[0_0_10px_rgba(244,63,94,0.15)]'
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
            className="p-2 rounded-xl bg-[#170928]/85 hover:bg-[#250e40] text-zinc-400 hover:text-white border border-white/[0.1] hover:border-rose-400/40 transition-all cursor-pointer"
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-rose-400 drop-shadow-[0_0_6px_#fb7185]" />}
          </button>

          {/* Rules Button */}
          <button
            onClick={onOpenRules}
            className="p-2 rounded-xl bg-[#170928]/85 hover:bg-[#250e40] text-zinc-400 hover:text-white border border-white/[0.1] hover:border-rose-400/40 transition-all cursor-pointer"
            title="Правила игры"
          >
            <HelpCircle className="w-4 h-4 text-rose-300" />
          </button>

          {/* Firebase Settings */}
          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-xl transition-all border cursor-pointer ${
              isFirebaseActive
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-400/50 hover:bg-emerald-900/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'bg-[#170928]/85 text-zinc-400 border-white/[0.1] hover:bg-[#250e40] hover:text-white'
            }`}
            title={
              isFirebaseActive
                ? 'Firebase Realtime DB подключена'
                : 'Демо-режим (Нажмите для настройки Firebase)'
            }
          >
            {isFirebaseActive ? (
              <Flame className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_6px_#34d399]" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
