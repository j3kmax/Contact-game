import { useState, useEffect, useCallback, useRef } from 'react';
import { Room, Player, HistoryItem, GameStatus } from '../types/game';
import { gameStorage } from '../services/gameStorage';
import { sounds } from '../services/sound';

function normalizeWord(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9]/gi, '');
}

export function useGameRoom(roomId: string | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [currentUser, setCurrentUser] = useState<Player | null>(() => {
    const saved = localStorage.getItem(`contact_player_${roomId}`);
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const prevStatusRef = useRef<GameStatus | null>(null);

  // Subscribe to room updates
  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = gameStorage.subscribeToRoom(roomId, (updatedRoom) => {
      setRoom(updatedRoom);
      setLoading(false);

      // Trigger audio alerts on status transitions
      if (updatedRoom && prevStatusRef.current !== updatedRoom.status) {
        if (updatedRoom.status === 'CONTACT_DECLARED') {
          sounds.playContactAlert();
        } else if (updatedRoom.status === 'GAME_OVER') {
          sounds.playWin();
        }
        prevStatusRef.current = updatedRoom.status;
      }
    });

    return () => unsubscribe();
  }, [roomId]);

  // Save current player to localStorage
  const persistUser = (player: Player) => {
    setCurrentUser(player);
    if (roomId) {
      localStorage.setItem(`contact_player_${roomId}`, JSON.stringify(player));
    }
  };

  // Helper to add history item
  const addLog = useCallback(
    (history: HistoryItem[], text: string, type: HistoryItem['type'], authorName?: string): HistoryItem[] => {
      const newItem: HistoryItem = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: Date.now(),
        text,
        type,
        authorName,
      };
      return [newItem, ...(history || [])].slice(0, 50); // Keep last 50 entries
    },
    []
  );

  // 1. Join / Create Room
  const joinRoom = useCallback(
    async (name: string, role: 'host' | 'player') => {
      if (!roomId) return;

      const trimmedName = name.trim();
      if (!trimmedName) throw new Error('Пожалуйста, введите ваше имя');

      const existingPlayerId = currentUser?.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const player: Player = {
        id: existingPlayerId,
        name: trimmedName,
        role: role,
        isOnline: true,
        joinedAt: Date.now(),
      };

      if (!room) {
        // First user creates room
        const newRoom: Room = {
          roomId,
          hostId: role === 'host' ? player.id : '',
          secretWord: '',
          revealedLettersCount: 1,
          status: 'LOBBY',
          players: {
            [player.id]: player,
          },
          currentQuestion: null,
          contactData: null,
          submissions: {},
          historyLog: [
            {
              id: `log_init_${Date.now()}`,
              timestamp: Date.now(),
              text: `Комната создана игроком ${trimmedName} (${role === 'host' ? 'Ведущий' : 'Игрок'})`,
              type: 'info',
            },
          ],
          createdAt: Date.now(),
        };
        await gameStorage.saveRoom(roomId, newRoom);
      } else {
        // Room exists: update or join
        const updatedPlayers = {
          ...room.players,
          [player.id]: player,
        };

        const updates: Partial<Room> = {
          players: updatedPlayers,
        };

        if (role === 'host' && (!room.hostId || !room.players[room.hostId])) {
          updates.hostId = player.id;
        }

        const newLogs = addLog(
          room.historyLog,
          `${trimmedName} вошел в игру как ${role === 'host' ? 'Ведущий' : 'Игрок'}`,
          'info'
        );
        updates.historyLog = newLogs;

        await gameStorage.updateRoom(roomId, updates);
      }

      persistUser(player);
      sounds.playPop();
    },
    [roomId, room, currentUser, addLog]
  );

  // 2. Start Game (Host only)
  const startGame = useCallback(
    async (secretWord: string) => {
      if (!room || !roomId || !currentUser) return;
      if (currentUser.role !== 'host') {
        throw new Error('Только ведущий может начать игру');
      }

      const cleanWord = secretWord.trim().toUpperCase();
      if (!/^[А-ЯЁ]{3,}$/i.test(cleanWord)) {
        throw new Error('Слово должно состоять только из русских букв (минимум 3 буквы)');
      }

      const firstLetter = cleanWord[0];
      const updates: Partial<Room> = {
        secretWord: cleanWord,
        revealedLettersCount: 1,
        status: 'QUESTION_PHASE',
        currentQuestion: null,
        contactData: null,
        submissions: {},
        winner: null,
        historyLog: addLog(
          room.historyLog,
          `Ведущий загадал слово из ${cleanWord.length} букв. Первая буква: «${firstLetter}»! Игра началась!`,
          'info'
        ),
      };

      await gameStorage.updateRoom(roomId, updates);
      sounds.playSuccess();
    },
    [room, roomId, currentUser, addLog]
  );

  // 3. Ask Question (Players only)
  const askQuestion = useCallback(
    async (text: string) => {
      if (!room || !roomId || !currentUser) return;
      if (currentUser.role === 'host') {
        throw new Error('Ведущий не может задавать вопросы');
      }
      if (room.status !== 'QUESTION_PHASE') {
        throw new Error('Сейчас нельзя задать вопрос');
      }

      const cleanText = text.trim();
      if (!cleanText) return;

      const updates: Partial<Room> = {
        currentQuestion: {
          authorId: currentUser.id,
          authorName: currentUser.name,
          text: cleanText,
          createdAt: Date.now(),
        },
        contactData: null,
        submissions: {},
        historyLog: addLog(
          room.historyLog,
          `${currentUser.name} задал вопрос: «${cleanText}»`,
          'question',
          currentUser.name
        ),
      };

      await gameStorage.updateRoom(roomId, updates);
      sounds.playPop();
    },
    [room, roomId, currentUser, addLog]
  );

  // 4. Cancel Question
  const cancelQuestion = useCallback(async () => {
    if (!room || !roomId || !currentUser) return;
    if (
      currentUser.role !== 'host' &&
      room.currentQuestion?.authorId !== currentUser.id
    ) {
      return;
    }

    const updates: Partial<Room> = {
      currentQuestion: null,
      contactData: null,
      submissions: {},
      status: 'QUESTION_PHASE',
      historyLog: addLog(room.historyLog, `Вопрос был отменен`, 'info'),
    };

    await gameStorage.updateRoom(roomId, updates);
  }, [room, roomId, currentUser, addLog]);

  // 5. Declare Contact
  const declareContact = useCallback(async () => {
    if (!room || !roomId || !currentUser) return;
    if (currentUser.role === 'host') {
      throw new Error('Ведущий не может нажимать Контакт');
    }
    if (room.status !== 'QUESTION_PHASE' || !room.currentQuestion) {
      throw new Error('Нет активного вопроса для контакта');
    }
    if (room.currentQuestion.authorId === currentUser.id) {
      throw new Error('Автор вопроса не может нажимать Контакт на свой же вопрос');
    }

    const timerExpiresAt = Date.now() + 10000; // 10 seconds

    const updates: Partial<Room> = {
      status: 'CONTACT_DECLARED',
      contactData: {
        partnerId: currentUser.id,
        partnerName: currentUser.name,
        timerExpiresAt,
      },
      submissions: {},
      historyLog: addLog(
        room.historyLog,
        `⚡ ${currentUser.name} крикнул: «КОНТАКТ!» Пошел обратный отсчет 10 секунд!`,
        'contact',
        currentUser.name
      ),
    };

    await gameStorage.updateRoom(roomId, updates);
    sounds.playContactAlert();
  }, [room, roomId, currentUser, addLog]);

  // 6. Host Deflects ("Это не...")
  const deflect = useCallback(
    async (deflectWord: string) => {
      if (!room || !roomId || !currentUser) return { success: false, error: 'Нет подключения' };
      if (currentUser.role !== 'host') {
        return { success: false, error: 'Только ведущий может отбивать вопросы' };
      }
      if (!room.currentQuestion) {
        return { success: false, error: 'Нет активного вопроса' };
      }

      const cleanDeflect = normalizeWord(deflectWord);
      const revealedPrefix = normalizeWord(room.secretWord.slice(0, room.revealedLettersCount));

      if (!cleanDeflect.startsWith(revealedPrefix)) {
        return {
          success: false,
          error: `Слово отбития должно начинаться с открытых букв: «${revealedPrefix.toUpperCase()}»`,
        };
      }

      const updates: Partial<Room> = {
        status: 'QUESTION_PHASE',
        currentQuestion: null,
        contactData: null,
        submissions: {},
        historyLog: addLog(
          room.historyLog,
          `🛡️ Ведущий отбил вопрос словом: «Это не ${deflectWord.toUpperCase()}»! Вопрос снят.`,
          'deflect'
        ),
      };

      await gameStorage.updateRoom(roomId, updates);
      sounds.playDeflect();
      return { success: true };
    },
    [room, roomId, currentUser, addLog]
  );

  // 7. Timer Expired -> Transition to VERIFY_MATCH
  const handleTimerExpired = useCallback(async () => {
    if (!room || !roomId) return;
    if (room.status !== 'CONTACT_DECLARED') return;

    const updates: Partial<Room> = {
      status: 'VERIFY_MATCH',
      submissions: {},
      historyLog: addLog(
        room.historyLog,
        `⏰ Время вышло! Ведущий не успел отбить. Игроки сверяют свои ассоциации!`,
        'info'
      ),
    };

    await gameStorage.updateRoom(roomId, updates);
  }, [room, roomId, addLog]);

  // 8. Submit Word in VERIFY_MATCH
  const submitMatchWord = useCallback(
    async (word: string) => {
      if (!room || !roomId || !currentUser) return;
      if (room.status !== 'VERIFY_MATCH') return;

      const isAuthor = room.currentQuestion?.authorId === currentUser.id;
      const isPartner = room.contactData?.partnerId === currentUser.id;

      if (!isAuthor && !isPartner) {
        throw new Error('Только автор вопроса и партнер контакта вводят слова');
      }

      const cleanWord = normalizeWord(word);
      const revealedPrefix = normalizeWord(room.secretWord.slice(0, room.revealedLettersCount));

      if (!cleanWord.startsWith(revealedPrefix)) {
        throw new Error(`Слово должно начинаться с открытых букв: «${revealedPrefix.toUpperCase()}»`);
      }

      const updatedSubmissions = {
        ...(room.submissions || {}),
        [currentUser.id]: word.trim(),
      };

      const authorId = room.currentQuestion!.authorId;
      const partnerId = room.contactData!.partnerId;

      const authorWord = updatedSubmissions[authorId];
      const partnerWord = updatedSubmissions[partnerId];

      if (authorWord && partnerWord) {
        // Both submitted! Compare!
        const normAuthor = normalizeWord(authorWord);
        const normPartner = normalizeWord(partnerWord);

        if (normAuthor === normPartner) {
          // MATCH! Success!
          const nextCount = room.revealedLettersCount + 1;
          const isGameOver = nextCount >= room.secretWord.length;
          const revealedLetter = room.secretWord[nextCount - 1];

          let logMessage = `🎉 КОНТАКТ УСПЕШЕН! Слова совпали: «${authorWord.toUpperCase()}»! Открыта буква: «${revealedLetter}».`;
          if (isGameOver) {
            logMessage = `🏆 ПОБЕДА ИГРОКОВ! Открыто всё слово: «${room.secretWord}»!`;
          }

          const updates: Partial<Room> = {
            revealedLettersCount: isGameOver ? room.secretWord.length : nextCount,
            status: isGameOver ? 'GAME_OVER' : 'QUESTION_PHASE',
            winner: isGameOver ? 'players' : null,
            currentQuestion: null,
            contactData: null,
            submissions: updatedSubmissions,
            historyLog: addLog(room.historyLog, logMessage, 'match'),
          };

          await gameStorage.updateRoom(roomId, updates);
          if (isGameOver) {
            sounds.playWin();
          } else {
            sounds.playSuccess();
          }
        } else {
          // MISMATCH! Fail!
          const updates: Partial<Room> = {
            status: 'QUESTION_PHASE',
            currentQuestion: null,
            contactData: null,
            submissions: updatedSubmissions,
            historyLog: addLog(
              room.historyLog,
              `❌ Контакт провален! ${room.currentQuestion?.authorName} имел в виду «${authorWord}», а ${room.contactData?.partnerName} думал о «${partnerWord}». Буква не открыта.`,
              'mismatch'
            ),
          };

          await gameStorage.updateRoom(roomId, updates);
          sounds.playFail();
        }
      } else {
        // Waiting for the other player
        const updates: Partial<Room> = {
          submissions: updatedSubmissions,
          historyLog: addLog(
            room.historyLog,
            `${currentUser.name} ввел свое слово и ждет напарника...`,
            'info'
          ),
        };
        await gameStorage.updateRoom(roomId, updates);
        sounds.playPop();
      }
    },
    [room, roomId, currentUser, addLog]
  );

  // 9. Direct Guess (Any player guesses entire word)
  const directGuess = useCallback(
    async (word: string) => {
      if (!room || !roomId || !currentUser) return { correct: false, message: '' };

      const cleanGuess = normalizeWord(word);
      const cleanSecret = normalizeWord(room.secretWord);

      if (cleanGuess === cleanSecret) {
        // Player won!
        const updates: Partial<Room> = {
          revealedLettersCount: room.secretWord.length,
          status: 'GAME_OVER',
          winner: 'players',
          historyLog: addLog(
            room.historyLog,
            `🌟 БИНГО! ${currentUser.name} назвал слово целиком: «${room.secretWord}»! ПОБЕДА ИГРОКОВ!`,
            'win',
            currentUser.name
          ),
        };
        await gameStorage.updateRoom(roomId, updates);
        sounds.playWin();
        return { correct: true, message: 'Поздравляем! Вы угадали всё слово!' };
      } else {
        // Wrong guess
        const updates: Partial<Room> = {
          historyLog: addLog(
            room.historyLog,
            `⚠️ ${currentUser.name} попытался назвать всё слово «${word.toUpperCase()}», но не угадал!`,
            'guess',
            currentUser.name
          ),
        };
        await gameStorage.updateRoom(roomId, updates);
        sounds.playFail();
        return { correct: false, message: `Слово «${word.toUpperCase()}» неверно!` };
      }
    },
    [room, roomId, currentUser, addLog]
  );

  // 10. Restart Game
  const restartGame = useCallback(async () => {
    if (!room || !roomId || !currentUser) return;
    if (currentUser.role !== 'host') {
      throw new Error('Только ведущий может перезапустить игру');
    }

    const updates: Partial<Room> = {
      status: 'LOBBY',
      secretWord: '',
      revealedLettersCount: 1,
      currentQuestion: null,
      contactData: null,
      submissions: {},
      winner: null,
      historyLog: addLog(room.historyLog, `Ведущий вернул игру в лобби для нового раунда.`, 'info'),
    };

    await gameStorage.updateRoom(roomId, updates);
    sounds.playPop();
  }, [room, roomId, currentUser, addLog]);

  return {
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
  };
}
