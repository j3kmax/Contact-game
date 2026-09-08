import React, { useState } from 'react';
import { HistoryItem } from '../types/game';
import {
  History,
  HelpCircle,
  Zap,
  Shield,
  CheckCircle2,
  XCircle,
  KeyRound,
  Trophy,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface HistoryLogProps {
  history: HistoryItem[];
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ history }) => {
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  const getIcon = (type: HistoryItem['type']) => {
    switch (type) {
      case 'question':
        return <HelpCircle className="w-3.5 h-3.5 text-purple-400" />;
      case 'contact':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'deflect':
        return <Shield className="w-3.5 h-3.5 text-rose-400" />;
      case 'match':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'mismatch':
        return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'guess':
        return <KeyRound className="w-3.5 h-3.5 text-rose-400" />;
      case 'win':
        return <Trophy className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getBorderAccent = (type: HistoryItem['type']) => {
    switch (type) {
      case 'match':
      case 'win':
        return 'border-l-emerald-500';
      case 'contact':
        return 'border-l-amber-500';
      case 'deflect':
      case 'mismatch':
        return 'border-l-rose-500';
      case 'guess':
        return 'border-l-rose-400';
      default:
        return 'border-l-purple-500';
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="w-full glass-panel-elevated rounded-3xl border border-white/[0.08] overflow-hidden flex flex-col specular-border shadow-xl">
      {/* Header */}
      <div
        onClick={() => setIsOpenMobile(!isOpenMobile)}
        className="px-4 py-3.5 border-b border-white/[0.08] flex items-center justify-between cursor-pointer sm:cursor-default select-none bg-[#140624]/80"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-rose-400" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-zinc-300 font-mono">
            Хроника событий
          </h4>
          <span className="px-2 py-0.5 rounded-full bg-[#1b0832] border border-white/[0.08] text-zinc-400 text-[10px] font-mono font-bold">
            {history?.length || 0}
          </span>
        </div>

        <div className="sm:hidden text-zinc-400">
          {isOpenMobile ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Events List */}
      <div
        className={`overflow-y-auto max-h-72 sm:max-h-96 p-3 flex flex-col gap-2 transition-all duration-200 ${
          isOpenMobile ? 'flex' : 'hidden sm:flex'
        }`}
      >
        {(!history || history.length === 0) ? (
          <div className="text-center py-8 text-zinc-500 text-xs font-mono">
            Событий пока нет. Загадайте слово или намёк!
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className={`p-2.5 rounded-2xl bg-[#150626]/90 border border-white/[0.08] border-l-2 ${getBorderAccent(
                item.type
              )} flex items-start gap-2.5 text-xs transition-colors hover:border-white/[0.18] shadow-sm`}
            >
              <div className="mt-0.5 shrink-0">{getIcon(item.type)}</div>
              <div className="flex-1 leading-snug">
                <p className="text-zinc-200 font-medium">{item.text}</p>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono shrink-0 whitespace-nowrap mt-0.5">
                {formatTime(item.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
