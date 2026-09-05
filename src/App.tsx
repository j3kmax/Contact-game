import { useState, useEffect } from 'react';
import { useGameRoom } from './hooks/useGameRoom';
import { Header } from './components/Header';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { RulesModal } from './components/RulesModal';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { Gamepad2, Plus, ArrowRight, Loader2 } from 'lucide-react';
import { sounds } from './services/sound';

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function App() {
  const [roomId, setRoomId] = useState<string | null>(() => {
    // 1. Check hash e.g. #room=ABCDEF
    const hash = window.location.hash;
    const match = hash.match(/room=([A-Za-z0-9_-]+)/);
    if (match && match[1]) return match[1].toUpperCase();

    // 2. Check path e.g. /room/ABCDEF
    const pathParts = window.location.pathname.split('/');
    const roomIdx = pathParts.indexOf('room');
    if (roomIdx !== -1 && pathParts[roomIdx + 1]) {
      return pathParts[roomIdx + 1].toUpperCase();
    }

    return null;
  });

  const [inputCode, setInputCode] = useState('');
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync roomId change with URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const match = window.location.hash.match(/room=([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        setRoomId(match[1].toUpperCase());
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateToRoom = (id: string) => {
    const clean = id.trim().toUpperCase();
    if (!clean) return;
    window.location.hash = `room=${clean}`;
    setRoomId(clean);
    sounds.playPop();
  };

  const {
    room,
    currentUser,
    loading,
    joinRoom,
    startGame,
    askQuestion,
    cancelQuestion,
    declareContact,
    deflect,
    handleTimerExpired,
    submitMatchWord,
    directGuess,
    restartGame,
  } = useGameRoom(roomId);

  const isUserJoined = !!currentUser && !!room?.players?.[currentUser.id];
  const isInGame = room && room.status !== 'LOBBY' && isUserJoined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white relative">
      {/* Background Decorative Gradient Orbs */}
      <div className="fixed top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      {/* Main Header */}
      <Header
        room={room}
        currentUser={currentUser}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col">
        {!roomId ? (
          /* Landing Screen: No Room Selected */
          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto py-12 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-0.5 shadow-2xl shadow-indigo-500/30 mb-6">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
                <Gamepad2 className="w-10 h-10 text-indigo-400" />
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">
              ЕСТЬ КОНТАКТ!
            </h1>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-8">
              Легендарная словесная party-игра для друзей и весёлых компаний.
              Загадывайте намёки, ловите ассоциации и открывайте тайное слово буква за буквой!
            </p>

            {/* Quick Room Actions */}
            <div className="w-full flex flex-col gap-4">
              <button
                onClick={() => navigateToRoom(generateRoomId())}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold text-lg shadow-xl shadow-indigo-500/25 flex items-center justify-center gap-2.5 transform transition-all active:scale-98"
              >
                <Plus className="w-5 h-5" />
                <span>Создать новую комнату</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-950 px-3 text-xs uppercase tracking-wider text-slate-500 font-semibold absolute">
                  или
                </span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigateToRoom(inputCode);
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="ВВЕДИТЕ КОД КОМНАТЫ..."
                  className="flex-1 px-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 font-mono font-bold tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={!inputCode.trim()}
                  className="px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <span>Войти</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <button
                onClick={() => setIsRulesOpen(true)}
                className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4"
              >
                Как играть в «Контакт»? Правила игры
              </button>
            </div>
          </div>
        ) : loading ? (
          /* Room Loading State */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-sm font-medium">Подключение к комнате {roomId}...</p>
          </div>
        ) : isInGame ? (
          /* Active Game View */
          <GameBoard
            room={room}
            currentUser={currentUser!}
            onAskQuestion={askQuestion}
            onCancelQuestion={cancelQuestion}
            onDeclareContact={declareContact}
            onDeflect={deflect}
            onTimerExpired={handleTimerExpired}
            onSubmitMatchWord={submitMatchWord}
            onDirectGuess={directGuess}
            onRestartGame={restartGame}
          />
        ) : (
          /* Lobby View (Waiting for start / Joining) */
          <Lobby
            room={room}
            currentUser={currentUser}
            roomId={roomId}
            onJoin={joinRoom}
            onStartGame={startGame}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>«Контакт» — сетевая игра в реальном времени • Serverless Architecture (Firebase / Broadcast)</p>
      </footer>

      {/* Global Modals */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      <FirebaseConfigModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export default App;
