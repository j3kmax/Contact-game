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
        return <HelpCircle className="w-3.5 h-3.5 text-blue-400" />;
      case 'contact':
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'deflect':
        return <Shield className="w-3.5 h-3.5 text-rose-400" />;
      case 'match':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'mismatch':
        return <XCircle className="w-3.5 h-3.5 text-rose-400" />;
      case 'guess':
        return <KeyRound className="w-3.5 h-3.5 text-cyan-400" />;
      case 'win':
        return <Trophy className="w-3.5 h-3.5 text-amber-400" />;
      default:
        return <Info className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="w-full glass-panel rounded-2xl border border-slate-800/80 overflow-hidden flex flex-col bg-[#0d111c]/90">
      {/* Header */}
      <div
        onClick={() => setIsOpenMobile(!isOpenMobile)}
        className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between cursor-pointer sm:cursor-default select-none bg-[#090b10]/80"
      >
        <div className="flex items-center gap-2">
          <History className="w-3.5 h-3.5 text-blue-400" />
          <h4 className="font-bold text-xs uppercase tracking-wider text-slate-300">
            История событий
          </h4>
          <span className="px-2 py-0.5 rounded-full bg-[#0d111c] border border-slate-800 text-slate-400 text-[10px] font-mono">
            {history?.length || 0}
          </span>
        </div>

        <div className="sm:hidden text-slate-400">
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
          <div className="text-center py-6 text-slate-500 text-xs">
            Событий пока нет. Начните с вопроса!
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-xl bg-[#090b10]/90 border border-slate-800/80 flex items-start gap-2.5 text-xs transition-colors hover:border-slate-700"
            >
              <div className="mt-0.5 shrink-0">{getIcon(item.type)}</div>
              <div className="flex-1 leading-snug">
                <p className="text-slate-300 font-medium">{item.text}</p>
              </div>
              <div className="text-[10px] text-slate-500 font-mono shrink-0 whitespace-nowrap mt-0.5">
                {formatTime(item.timestamp)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
