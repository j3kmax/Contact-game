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
    <header className="sticky top-0 z-30 w-full bg-[#0c0e15]/90 backdrop-blur-xl border-b border-white/[0.07] px-4 py-3 sm:px-6 shadow-xl shadow-black/40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 border border-white/10 flex items-center justify-center text-blue-400 shadow-md ring-1 ring-white/5">
            <Gamepad2 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white">
                КОНТАКТ!
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest rounded-md bg-blue-950/40 text-blue-300 border border-blue-800/40">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 hidden sm:block">
              Интеллектуальная вербальная игра
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 text-xs font-mono border border-zinc-800 hover:border-zinc-700 transition-all group"
              >
                <span className="text-zinc-500 text-[11px] font-sans">Код:</span>
                <span className="font-bold text-zinc-100 group-hover:text-blue-400 transition-colors">{room.roomId}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 ml-0.5 transition-colors" />
                )}
              </button>

              {/* Player Count */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-300 text-xs font-mono">
                <Users className="w-3.5 h-3.5 text-zinc-500" />
                <span>{playerCount}</span>
              </div>

              {/* Current Role Badge */}
              {currentUser && (
                <div
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 border transition-colors ${
                    currentUser.id === (room?.leaderId || room?.hostId)
                      ? 'bg-blue-950/50 text-blue-200 border-blue-500/40 shadow-sm'
                      : currentUser.id === room?.hostId
                      ? 'bg-amber-950/40 text-amber-200 border-amber-500/40 shadow-sm'
                      : 'bg-zinc-900/80 text-zinc-300 border-zinc-800'
                  }`}
                >
                  <span>
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
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-blue-400" />}
          </button>

          {/* Rules Button */}
          <button
            onClick={onOpenRules}
            className="p-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
            title="Правила игры"
          >
            <HelpCircle className="w-4 h-4 text-zinc-300" />
          </button>

          {/* Firebase Settings */}
          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-xl transition-colors border ${
              isFirebaseActive
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 hover:bg-emerald-900/40'
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
            title={
              isFirebaseActive
                ? 'Firebase Realtime DB подключен'
                : 'Демо-режим (Нажмите для настройки Firebase)'
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
