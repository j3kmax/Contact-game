import React from 'react';
import { HelpCircle, X, Shield, Zap, Lock, Trophy, Sparkles } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-xl glass-panel-glow rounded-3xl p-6 sm:p-8 shadow-2xl border border-indigo-500/30 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">Правила игры «Контакт»</h3>
            <p className="text-xs text-slate-400">Классическая словесная party-игра для компании</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          {/* Rule 1 */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">1. Начало и ведущий</h4>
              <p>
                Ведущий загадывает тайное слово (например, <strong>«КОСМОДРОМ»</strong>). В начале игры открывается первая буква: <strong>«К...»</strong>. Цель игроков — угадать всё слово, открывая букву за буквой.
              </p>
            </div>
          </div>

          {/* Rule 2 */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">2. Вопросы и ассоциации</h4>
              <p>
                Любой игрок может задать намёк на другое слово, начинающееся на открытые буквы (например: <em>«Это не то, чем копают огород?»</em> — имея в виду слово <strong>Лопата</strong> или на К — <strong>Культиватор</strong>).
              </p>
            </div>
          </div>

          {/* Rule 3 */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">3. «Есть контакт!» и отбитие ведущего</h4>
              <p>
                Ведущий может отбить намёк <strong>сразу же</strong>, сказав <em>«Это не...»</em>.
                Если другой игрок понял намёк, он жмет <strong>«КОНТАКТ!»</strong> и сразу вводит отгадку.
                Запускается отсчет 10 секунд. Другие игроки могут тоже присоединиться и ввести своё слово.
                Ведущий может пытаться отбить контакт («Это не...») или нажать <strong>«Сдаюсь»</strong>, чтобы не ждать 10 секунд.
              </p>
            </div>
          </div>

          {/* Rule 4 */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">4. Сверка слов и правило ошибки</h4>
              <p>
                Когда таймер истекает или ведущий сдается, слова автора и всех поддержавших игроков мгновенно сверяются:
                <br />
                • Если <strong>все игроки</strong> назвали правильное слово автора — ведущий обязан открыть следующую букву!
                <br />
                • Если <strong>хотя бы один игрок ошибся</strong> (назвал другое слово) — контакт провален, буква не открывается!
              </p>
            </div>
          </div>

          {/* Rule 5 */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/20 text-yellow-300 flex items-center justify-center shrink-0 mt-0.5">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-1">5. Победа</h4>
              <p>
                Игроки побеждают, когда откроются все буквы тайного слова, либо если кто-то угадает всё слово целиком через «Прямую угадайку»!
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all"
          >
            Понятно, в игру!
          </button>
        </div>
      </div>
    </div>
  );
};
