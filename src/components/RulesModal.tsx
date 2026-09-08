import React from 'react';
import { HelpCircle, X, Shield, Zap, Lock, Trophy, Sparkles, Mic, Medal } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in">
      <div className="w-full max-w-xl glass-panel-elevated rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(16,185,129,0.25),0_20px_50px_rgba(0,0,0,0.85)] border border-emerald-500/40 relative max-h-[90vh] overflow-y-auto specular-border">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500/25 to-lime-500/25 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.35)] shrink-0">
            <HelpCircle className="w-5 h-5 drop-shadow-[0_0_6px_#10b981]" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-lime-300 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              Правила игры «Контакт»
            </h3>
            <p className="text-xs text-zinc-300">Для голосового чата (Discord) с системой турнирных баллов</p>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 text-xs sm:text-sm text-zinc-300 leading-relaxed">
          {/* Rule 1 */}
          <div className="p-4 rounded-2xl bg-[#061e14]/90 border border-white/[0.08] flex gap-3 shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">1. Начало и ведущий</h4>
              <p>
                Ведущий загадывает слово (например, <strong>«КОСМОДРОМ»</strong>). В начале игры открывается первая буква: <strong>«К...»</strong>. Цель игроков — открывать букву за буквой.
              </p>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="p-4 rounded-2xl bg-[#061e14]/90 border border-white/[0.08] flex gap-3 shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">2. Очередь и голосовой намёк в Discord</h4>
              <p>
                Игроки ходят <strong>строго по очереди по кругу</strong>. В свой ход игрок вводит секретное слово-отгадку в игре, а саму ассоциацию <strong>озвучивает вслух голосом в Discord</strong> (например: <em>«Это не то, чем копают землю?»</em>).
              </p>
            </div>
          </div>

          {/* Rule 3 */}
          <div className="p-4 rounded-2xl bg-[#061e14]/90 border border-white/[0.08] flex gap-3 shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">3. «Есть контакт!» и отбитие ведущего</h4>
              <p>
                Ведущий может отбить намёк <strong>сразу же</strong> («Это не...»).
                Если другой игрок понял намёк, он нажимает <strong>«КОНТАКТ!»</strong> и сразу пишет отгадку.
                Идет 10 секунд — другие игроки тоже могут поддержать контакт своим словом. Ведущий может отбивать («Это не...») или нажать <strong>«Сдаюсь»</strong>.
              </p>
            </div>
          </div>

          {/* Rule 4 */}
          <div className="p-4 rounded-2xl bg-[#061e14]/90 border border-white/[0.08] flex gap-3 shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">4. Сверка слов и правило ошибки</h4>
              <p>
                После отсчёта слова автора и всех поддержавших игроков мгновенно сверяются:
                <br />
                • Если <strong>все игроки</strong> назвали правильное слово автора — открывается следующая буква!
                <br />
                • Если <strong>хотя бы один игрок ошибся</strong> — контакт провален, буква не открывается!
              </p>
            </div>
          </div>

          {/* Rule 5 */}
          <div className="p-4 rounded-2xl bg-[#061e14]/90 border border-white/[0.08] flex gap-3 shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-lime-500/15 border border-lime-500/30 text-lime-400 flex items-center justify-center shrink-0 mt-0.5">
              <Medal className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">5. Система начисления баллов и раунды</h4>
              <ul className="list-disc pl-4 space-y-1 text-zinc-300 mt-1.5">
                <li><strong>+10 очков</strong> автору за успешный контакт.</li>
                <li><strong>+10 очков</strong> первому партнёру за контакт.</li>
                <li><strong>+5 очков</strong> каждому игроку, верно поддержавшему контакт.</li>
                <li><strong>+10 очков</strong> ведущему за отбитие намёка («Это не...»).</li>
                <li><strong>+25 очков</strong> за прямую угадайку всего тайного слова целиком (1 попытка раз в 30 секунд!).</li>
                <li><strong>Баллы сохраняются</strong> между раундами. Хост лобби может передавать хоста, исключать игроков и назначать ведущего на раунд.</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-lime-400 hover:from-emerald-300 hover:to-lime-300 text-slate-950 font-black text-sm shadow-lg shadow-emerald-950/40 border border-emerald-300/40 transition-all cursor-pointer active:scale-95"
          >
            Понятно, в игру!
          </button>
        </div>
      </div>
    </div>
  );
};
