import React, { useState, useEffect } from 'react';
import { Flame, X, Check, Trash2, Info, ExternalLink } from 'lucide-react';
import { FirebaseConfig } from '../types/game';
import {
  getSavedFirebaseConfig,
  saveFirebaseConfig,
  clearFirebaseConfig,
  isFirebaseConfigured,
} from '../config/firebase';

interface FirebaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FirebaseConfigModal: React.FC<FirebaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [jsonInput, setJsonInput] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [databaseURL, setDatabaseURL] = useState('');
  const [projectId, setProjectId] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = getSavedFirebaseConfig();
    if (existing) {
      setApiKey(existing.apiKey || '');
      setDatabaseURL(existing.databaseURL || '');
      setProjectId(existing.projectId || '');
      setAuthDomain(existing.authDomain || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfigured = isFirebaseConfigured();

  // Try parsing pasted Firebase JSON
  const handleParseJson = () => {
    try {
      setError(null);
      // Clean up common JS object syntax if pasted without quotes
      let clean = jsonInput.trim();
      if (clean.startsWith('const firebaseConfig =')) {
        clean = clean.replace('const firebaseConfig =', '').replace(/;$/, '').trim();
      }
      // If keys don't have quotes, add quotes
      const formatted = clean.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
      const parsed = JSON.parse(formatted);

      if (parsed.apiKey) setApiKey(parsed.apiKey);
      if (parsed.databaseURL) setDatabaseURL(parsed.databaseURL);
      if (parsed.projectId) setProjectId(parsed.projectId);
      if (parsed.authDomain) setAuthDomain(parsed.authDomain);
      setJsonInput('');
    } catch {
      setError('Не удалось распознать JSON. Заполните поля вручную.');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!databaseURL.trim()) {
      setError('Поле Database URL обязательно для Realtime Database');
      return;
    }

    const config: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      databaseURL: databaseURL.trim(),
      projectId: projectId.trim(),
    };

    saveFirebaseConfig(config);
    onClose();
  };

  const handleClear = () => {
    if (confirm('Сбросить настройки Firebase и вернуться в локальный демо-режим?')) {
      clearFirebaseConfig();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-panel-elevated rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(244,63,94,0.3),0_20px_50px_rgba(0,0,0,0.85)] border border-rose-500/40 bg-[#140624]/95 relative max-h-[90vh] overflow-y-auto specular-border">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
            <Flame className="w-5 h-5 drop-shadow-[0_0_6px_#f59e0b]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Настройки Firebase</h3>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-block mt-0.5 border ${
                isConfigured
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
              }`}
            >
              {isConfigured ? '● Подключен к облаку' : '● Локальный демо-режим (Broadcast)'}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-[#1b0832]/90 border border-white/[0.08] text-xs text-zinc-300 mb-4 flex items-start gap-2.5 leading-relaxed shadow-inner">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            В демо-режиме игра синхронизируется между вкладками браузера локально.
            Чтобы играть с друзьями через интернет, укажите данные вашего бесплатного проекта <strong>Firebase Realtime Database</strong>.
          </div>
        </div>

        {/* Quick Paste JSON */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Быстрая вставка объекта <code>firebaseConfig</code> из консоли:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{ "apiKey": "...", "databaseURL": "..." }'
              className="flex-1 px-3 py-2 text-xs rounded-xl bg-[#140624] text-zinc-200 border border-white/[0.1] font-mono focus:outline-none focus:border-rose-400"
            />
            <button
              type="button"
              onClick={handleParseJson}
              className="px-3 py-2 bg-[#1d0a36] hover:bg-[#280e4a] border border-white/[0.1] text-zinc-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Заполнить
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Database URL (Realtime DB) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={databaseURL}
              onChange={(e) => setDatabaseURL(e.target.value)}
              placeholder="https://your-app-default-rtdb.firebaseio.com"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#140624] text-white border border-white/[0.1] font-mono focus:ring-1 focus:ring-rose-400 focus:border-rose-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#140624] text-white border border-white/[0.1] font-mono focus:ring-1 focus:ring-rose-400 focus:border-rose-400 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Project ID
              </label>
              <input
                type="text"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder="my-contact-game"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-[#140624] text-white border border-white/[0.1] font-mono focus:ring-1 focus:ring-rose-400 focus:border-rose-400 focus:outline-none"
              />
            </div>
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-white/[0.08]">
            {isConfigured && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Сбросить в демо</span>
              </button>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#1b0832] hover:bg-[#280e4a] border border-white/[0.1] text-zinc-300 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-black rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-rose-950/40 border border-rose-300/40 transition-all cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Сохранить</span>
              </button>
            </div>
          </div>
        </form>

        <div className="mt-4 text-center">
          <a
            href="https://console.firebase.google.com/"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-rose-400 hover:text-rose-300 inline-flex items-center gap-1 transition-colors font-semibold"
          >
            <span>Открыть консоль Firebase</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
