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
      <div className="max-w-7xl mx-auto rounded-2xl bg-[#0b0e18]/85 backdrop-blur-2xl border border-white/[0.09] px-4 py-2.5 sm:px-6 shadow-2xl shadow-black/80 specular-border flex items-center justify-between gap-3 transition-all">
        {/* Brand Logo & Tag */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-blue-600/20 via-zinc-900 to-zinc-950 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-950/40 ring-1 ring-blue-400/20 shrink-0">
            <Gamepad2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wider text-white flex items-center gap-1.5">
                <span>КОНТАКТ</span>
                <span className="text-blue-500 text-xl leading-none">!</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium hidden sm:block">
              Словесна інтелектуальна гра
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
                title="Натисніть, щоб скопіювати посилання на кімнату"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#07090e]/90 hover:bg-zinc-900 text-zinc-200 text-xs font-mono border border-white/[0.08] hover:border-blue-500/40 transition-all group shadow-inner"
              >
                <span className="text-zinc-500 text-[11px] font-sans font-medium">Код:</span>
                <span className="font-bold tracking-wider text-white group-hover:text-blue-400 transition-colors">{room.roomId}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-blue-400 ml-0.5 transition-colors" />
                )}
              </button>

              {/* Player Count */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#07090e]/80 border border-white/[0.07] text-zinc-300 text-xs font-mono shadow-inner">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-bold">{playerCount}</span>
              </div>

              {/* Current Role Badge */}
              {currentUser && (
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shadow-sm ${
                    currentUser.id === (room?.leaderId || room?.hostId)
                      ? 'bg-amber-950/30 text-amber-200 border-amber-500/40 shadow-amber-950/20'
                      : currentUser.id === room?.hostId
                      ? 'bg-amber-950/25 text-amber-300 border-amber-500/30 shadow-amber-950/10'
                      : 'bg-[#07090e]/80 text-zinc-300 border-white/[0.07]'
                  }`}
                >
                  <span className="font-medium">
                    {currentUser.id === (room?.leaderId || room?.hostId)
                      ? '🎯 Ведучий'
                      : currentUser.id === room?.hostId
                      ? '👑 Хост'
                      : '🎮 Гравець'}
                  </span>
                </div>
              )}
            </>
          )}

          {/* Audio Mute Button */}
          <button
            onClick={toggleAudio}
            className="p-2 rounded-xl bg-[#07090e]/80 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-white/[0.07] hover:border-white/[0.15] transition-all"
            title={isMuted ? 'Увімкнути звук' : 'Вимкнути звук'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
          </button>

          {/* Rules Button */}
          <button
            onClick={onOpenRules}
            className="p-2 rounded-xl bg-[#07090e]/80 hover:bg-zinc-900 text-zinc-400 hover:text-white border border-white/[0.07] hover:border-white/[0.15] transition-all"
            title="Правила гри"
          >
            <HelpCircle className="w-4 h-4 text-zinc-300" />
          </button>

          {/* Firebase Settings */}
          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-xl transition-all border ${
              isFirebaseActive
                ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30 hover:bg-emerald-900/40 shadow-emerald-950/20'
                : 'bg-[#07090e]/80 text-zinc-400 border-white/[0.07] hover:bg-zinc-900 hover:text-white'
            }`}
            title={
              isFirebaseActive
                ? 'Firebase Realtime DB підключено'
                : 'Демо-режим (Натисніть для налаштування Firebase)'
            }
          >
            {isFirebaseActive ? (
              <Flame className="w-4 h-4 text-emerald-400" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
