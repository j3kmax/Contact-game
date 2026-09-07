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
    <header className="sticky top-0 z-30 w-full glass-panel border-b border-slate-800/80 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
                КОНТАКТ!
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                Party Game
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Интеллектуальная словесная дуэль
            </p>
          </div>
        </div>

        {/* Room Info & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {room && (
            <>
              {/* Room Code Badge */}
              <button
                onClick={handleCopyLink}
                title="Нажмите, чтобы скопировать ссылку на комнату"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-xs font-mono border border-slate-700/60 transition-all hover:border-indigo-500/50 group"
              >
                <span className="text-slate-400 text-[11px]">Код:</span>
                <span className="font-bold text-indigo-300 group-hover:text-indigo-200">{room.roomId}</span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-300 ml-0.5" />
                )}
              </button>

              {/* Player Count */}
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-300 text-xs">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>{playerCount}</span>
              </div>

              {/* Current Role Badge */}
              {currentUser && (
                <div
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border ${
                    currentUser.id === (room?.leaderId || room?.hostId)
                      ? 'bg-purple-950/60 text-purple-300 border-purple-600/40'
                      : currentUser.id === room?.hostId
                      ? 'bg-amber-950/60 text-amber-300 border-amber-600/40'
                      : 'bg-indigo-950/60 text-indigo-300 border-indigo-600/40'
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
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
          </button>

          {/* Rules Button */}
          <button
            onClick={onOpenRules}
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors"
            title="Правила игры"
          >
            <HelpCircle className="w-4 h-4 text-slate-300" />
          </button>

          {/* Firebase Settings */}
          <button
            onClick={onOpenSettings}
            className={`p-2 rounded-lg transition-colors border ${
              isFirebaseActive
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 hover:bg-emerald-900/40'
                : 'bg-amber-950/40 text-amber-400 border-amber-800/40 hover:bg-amber-900/40'
            }`}
            title={
              isFirebaseActive
                ? 'Firebase Realtime DB подключен'
                : 'Демо-режим (Нажмите для настройки Firebase)'
            }
          >
            {isFirebaseActive ? (
              <Flame className="w-4 h-4 text-orange-400" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
