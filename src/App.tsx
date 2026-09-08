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
    kickPlayer,
    transferLobbyHost,
    setRoundLeader,
    startGame,
    askQuestion,
    cancelQuestion,
    skipTurn,
    passTurnTo,
    declareContact,
    joinContact,
    hostGiveUp,
    deflect,
    acceptDeflect,
    handleTimerExpired,
    directGuess,
    restartGame,
  } = useGameRoom(roomId);

  const isUserJoined = !!currentUser && !!room?.players?.[currentUser.id];
  const isInGame = room && room.status !== 'LOBBY' && isUserJoined;

  return (
    <div className="min-h-screen bg-[#07090e] bg-subtle-grid bg-radial-mesh text-zinc-100 flex flex-col selection:bg-blue-600 selection:text-white relative">
      {/* Dynamic Ambient Glows */}
      <div className="fixed top-[-10%] left-1/2 -translate-x-1/2 w-[70vw] h-[50vh] rounded-full bg-blue-600/[0.08] blur-[150px] pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-indigo-600/[0.04] blur-[140px] pointer-events-none" />

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
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto py-12 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-b from-blue-600/20 via-zinc-900 to-[#07090e] border border-blue-500/30 shadow-2xl shadow-blue-950/40 flex items-center justify-center text-blue-400 mb-6 ring-1 ring-blue-400/20">
              <Gamepad2 className="w-8 h-8 text-blue-400" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0b0e18] border border-white/[0.09] text-[11px] font-semibold text-blue-400 uppercase tracking-widest mb-3 font-mono shadow-inner">
              Интеллектуальная онлайн-игра
            </div>

            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white via-zinc-100 to-zinc-400 mb-3">
              ЕСТЬ КОНТАКТ!
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto leading-relaxed mb-8 font-medium">
              Словесная игра на интуицию, ассоциации и командный расчёт.
              Разгадывайте намёки, координируйтесь в голосовом чате и открывайте буквы одну за другой.
            </p>

            {/* Quick Room Actions */}
            <div className="w-full flex flex-col gap-4">
              <button
                onClick={() => navigateToRoom(generateRoomId())}
                className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-base shadow-xl shadow-blue-950/50 border border-blue-400/30 flex items-center justify-center gap-2.5 transform transition-all active:scale-[0.99] cursor-pointer specular-border"
              >
                <Plus className="w-5 h-5" />
                <span>Создать новую комнату</span>
              </button>

              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-white/[0.08] w-full" />
                <span className="bg-[#07090e] px-3 text-[11px] uppercase tracking-wider text-zinc-500 font-bold font-mono absolute">
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
                  className="flex-1 px-4 py-3.5 rounded-2xl bg-[#0b0e18] border border-white/[0.09] text-white placeholder-zinc-600 font-mono font-bold tracking-wider focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors shadow-inner"
                />
                <button
                  type="submit"
                  disabled={!inputCode.trim()}
                  className="px-6 py-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/[0.09] font-bold text-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <span>Войти</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <button
                onClick={() => setIsRulesOpen(true)}
                className="mt-2 text-xs text-zinc-400 hover:text-white font-medium transition-colors cursor-pointer"
              >
                Правила и механика игры
              </button>
            </div>
          </div>
        ) : loading ? (
          /* Room Loading State */
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm font-medium font-mono">Подключение к комнате {roomId}...</p>
          </div>
        ) : isInGame ? (
          /* Active Game View */
          <GameBoard
            room={room}
            currentUser={currentUser!}
            onAskQuestion={askQuestion}
            onCancelQuestion={cancelQuestion}
            onSkipTurn={skipTurn}
            onDeclareContact={declareContact}
            onJoinContact={joinContact}
            onHostGiveUp={hostGiveUp}
            onDeflect={deflect}
            onAcceptDeflect={acceptDeflect}
            onTimerExpired={handleTimerExpired}
            onDirectGuess={directGuess}
            onRestartGame={restartGame}
            onKickPlayer={kickPlayer}
            onTransferLobbyHost={transferLobbyHost}
            onPassTurnTo={passTurnTo}
          />
        ) : (
          /* Lobby View (Waiting for start / Joining) */
          <Lobby
            room={room}
            currentUser={currentUser}
            roomId={roomId}
            onJoin={joinRoom}
            onStartGame={startGame}
            onKickPlayer={kickPlayer}
            onTransferLobbyHost={transferLobbyHost}
            onSetRoundLeader={setRoundLeader}
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
