import React from 'react';
import { HelpCircle, X, Shield, Zap, Lock, Trophy, Sparkles, Mic, Medal } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl glass-panel-glow rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800/90 bg-[#0d111c]/95 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">Правила игры «Контакт»</h3>
            <p className="text-xs text-slate-400">Для голосового чата (Discord) с системой баллов</p>
          </div>
        </div>

        <div className="flex flex-col gap-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {/* Rule 1 */}
          <div className="p-4 rounded-2xl bg-[#090b10]/90 border border-slate-800/80 flex gap-3">
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
          <div className="p-4 rounded-2xl bg-[#090b10]/90 border border-slate-800/80 flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
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
          <div className="p-4 rounded-2xl bg-[#090b10]/90 border border-slate-800/80 flex gap-3">
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
          <div className="p-4 rounded-2xl bg-[#090b10]/90 border border-slate-800/80 flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
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
          <div className="p-4 rounded-2xl bg-[#090b10]/90 border border-slate-800/80 flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Medal className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">5. Система начисления баллов и раунды</h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-300 mt-1.5">
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
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
          >
            Понятно, в игру!
          </button>
        </div>
      </div>
    </div>
  );
};
