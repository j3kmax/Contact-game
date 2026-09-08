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
      <div className="max-w-7xl mx-auto rounded-2xl bg-gradient-to-r from-[#141838]/90 via-[#0d1028]/95 to-[#141838]/90 backdrop-blur-2xl border border-white/[0.14] px-4 py-2.5 sm:px-6 shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(6,182,212,0.2)] specular-border flex items-center justify-between gap-3 transition-all">
        {/* Brand Logo & Tag */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/25 via-indigo-600/30 to-fuchsia-600/30 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.4)] shrink-0">
            <Gamepad2 className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-wider flex items-center gap-1">
                <span className="bg-gradient-to-r from-cyan-300 via-sky-200 to-fuchsia-300 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
                  КОНТАКТ
                </span>
                <span className="text-fuchsia-400 text-xl leading-none drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">!</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest rounded-md bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 text-cyan-200 border border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.25)]">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium hidden sm:block">
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
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#090d22]/90 hover:bg-[#11173d] text-zinc-200 text-xs font-mono border border-cyan-400/30 hover:border-cyan-400/70 shadow-[0_0_12px_rgba(6,182,212,0.15)] transition-all group cursor-pointer active:scale-95"
              >
                <span className="text-zinc-500 text-[11px] font-sans font-medium">Код:</span>
                <span className="font-bold tracking-wider text-white group-hover:text-cyan-300 transition-colors">{room.roomId}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-300 ml-0.5 transition-colors" />
                )}
              </button>

              {/* Player Count */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#090d22]/85 border border-white/[0.1] text-cyan-300 text-xs font-mono shadow-inner">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold">{playerCount}</span>
              </div>

              {/* Current Role Badge */}
              {currentUser && (
                <div
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shadow-sm ${
                    currentUser.id === (room?.leaderId || room?.hostId)
                      ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 shadow-[0_0_14px_rgba(245,158,11,0.25)]'
                      : currentUser.id === room?.hostId
                      ? 'bg-amber-500/15 text-amber-300 border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                      : 'bg-[#090d22]/90 text-cyan-200 border-cyan-400/30 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
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
            className="p-2 rounded-xl bg-[#090d22]/85 hover:bg-[#131840] text-zinc-400 hover:text-white border border-white/[0.1] hover:border-cyan-400/40 transition-all cursor-pointer"
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-zinc-500" /> : <Volume2 className="w-4 h-4 text-cyan-400 drop-shadow-[0_0_6px_#22d3ee]" />}
          </button>

          {/* Rules Button */}
          <button
            onClick={onOpenRules}
            className="p-2 rounded-xl bg-[#090d22]/85 hover:bg-[#131840] text-zinc-400 hover:text-white border border-white/[0.1] hover:border-cyan-400/40 transition-all cursor-pointer"
            title="Правила игры"
          >
            <HelpCircle className="w-4 h-4 text-zinc-300" />
          </button>

          {/* Firebase Settings */}
          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-xl transition-all border cursor-pointer ${
              isFirebaseActive
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-400/50 hover:bg-emerald-900/50 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'bg-[#090d22]/85 text-zinc-400 border-white/[0.1] hover:bg-[#131840] hover:text-white'
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
