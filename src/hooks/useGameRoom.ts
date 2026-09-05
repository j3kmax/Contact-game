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
        ...(authorName ? { authorName } : {}),
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
    async (text: string, intendedWord: string) => {
      if (!room || !roomId || !currentUser) return;
      if (currentUser.role === 'host') {
        throw new Error('Ведущий не может задавать вопросы');
      }
      if (room.status !== 'QUESTION_PHASE') {
        throw new Error('Сейчас нельзя задать вопрос');
      }

      const cleanText = text.trim();
      const cleanIntended = intendedWord.trim().toUpperCase();

      if (!cleanText) {
        throw new Error('Пожалуйста, введите ваш намёк');
      }
      if (!cleanIntended || cleanIntended.length < 2) {
        throw new Error('Пожалуйста, укажите загаданное вами слово (секретно)');
      }

      const revealedPrefix = normalizeWord(room.secretWord.slice(0, room.revealedLettersCount));
      const normIntended = normalizeWord(cleanIntended);

      if (!normIntended.startsWith(revealedPrefix)) {
        throw new Error(`Задуманное слово должно начинаться на открытые буквы: «${revealedPrefix.toUpperCase()}»`);
      }

      const updates: Partial<Room> = {
        currentQuestion: {
          authorId: currentUser.id,
          authorName: currentUser.name,
          text: cleanText,
          intendedWord: cleanIntended,
          createdAt: Date.now(),
        },
        contactData: null,
        lastDeflectAttempt: null,
        submissions: {
          [currentUser.id]: cleanIntended, // Lock author's intended word in submissions
        },
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
      lastDeflectAttempt: null,
      submissions: {},
      status: 'QUESTION_PHASE',
      historyLog: addLog(room.historyLog, `Вопрос был отменен`, 'info'),
    };

    await gameStorage.updateRoom(roomId, updates);
  }, [room, roomId, currentUser, addLog]);

  // Auto-recover from stuck VERIFY_MATCH state
  useEffect(() => {
    if (room && room.status === 'VERIFY_MATCH') {
      gameStorage.updateRoom(room.roomId, {
        status: 'QUESTION_PHASE',
        currentQuestion: null,
        contactData: null,
        submissions: {},
        lastDeflectAttempt: null,
      });
    }
  }, [room]);

  // 5. Declare Contact (Partner submits word immediately)
  const declareContact = useCallback(
    async (partnerWord: string) => {
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

      const cleanWord = normalizeWord(partnerWord);
      const revealedPrefix = normalizeWord(room.secretWord.slice(0, room.revealedLettersCount));

      if (!cleanWord.startsWith(revealedPrefix)) {
        throw new Error(`Слово должно начинаться с открытых букв: «${revealedPrefix.toUpperCase()}»`);
      }

      const timerExpiresAt = Date.now() + 10000; // 10 seconds

      const updates: Partial<Room> = {
        status: 'CONTACT_DECLARED',
        contactData: {
          partnerId: currentUser.id,
          partnerName: currentUser.name,
          additionalPartners: [],
          timerExpiresAt,
        },
        submissions: {
          ...(room.submissions || {}),
          [currentUser.id]: partnerWord.trim().toUpperCase(),
        },
        lastDeflectAttempt: null,
        historyLog: addLog(
          room.historyLog,
          `⚡ ${currentUser.name} крикнул: «КОНТАКТ!» Пошел обратный отсчет 10 секунд!`,
          'contact',
          currentUser.name
        ),
      };

      await gameStorage.updateRoom(roomId, updates);
      sounds.playContactAlert();
    },
    [room, roomId, currentUser, addLog]
  );

  // 5b. Another player joins the contact during the 10 seconds
  const joinContact = useCallback(
    async (word: string) => {
      if (!room || !roomId || !currentUser) return;
      if (currentUser.role === 'host') return;
      if (room.status !== 'CONTACT_DECLARED' || !room.contactData) return;
      if (room.currentQuestion?.authorId === currentUser.id) return;
      if (room.contactData.partnerId === currentUser.id) return;

      const cleanWord = normalizeWord(word);
      const revealedPrefix = normalizeWord(room.secretWord.slice(0, room.revealedLettersCount));

      if (!cleanWord.startsWith(revealedPrefix)) {
        throw new Error(`Слово должно начинаться с открытых букв: «${revealedPrefix.toUpperCase()}»`);
      }

      const existingAdditional = room.contactData.additionalPartners || [];
      if (existingAdditional.some((p) => p.id === currentUser.id)) return;

      const updates: Partial<Room> = {
        contactData: {
          ...room.contactData,
          additionalPartners: [
            ...existingAdditional,
            { id: currentUser.id, name: currentUser.name },
          ],
        },
        submissions: {
          ...(room.submissions || {}),
          [currentUser.id]: word.trim().toUpperCase(),
        },
        historyLog: addLog(
          room.historyLog,
          `🤝 ${currentUser.name} тоже присоединился к контакту!`,
          'contact',
          currentUser.name
        ),
      };

      await gameStorage.updateRoom(roomId, updates);
      sounds.playPop();
    },
    [room, roomId, currentUser, addLog]
  );

  // 6. Host Deflects ("Это не...")
  const deflect = useCallback(
    async (deflectWord: string): Promise<{ success: boolean; matched: boolean; error?: string }> => {
      if (!room || !roomId || !currentUser) return { success: false, matched: false, error: 'Нет подключения' };
      if (currentUser.role !== 'host') {
        return { success: false, matched: false, error: 'Только ведущий может отбивать вопросы' };
      }
      if (!room.currentQuestion) {
        return { success: false, matched: false, error: 'Нет активного вопроса' };
      }

      const cleanDeflect = normalizeWord(deflectWord);
      const revealedPrefix = normalizeWord(room.secretWord.slice(0, room.revealedLettersCount));

      if (!cleanDeflect.startsWith(revealedPrefix)) {
        return {
          success: false,
          matched: false,
          error: `Слово отбития должно начинаться с открытых букв: «${revealedPrefix.toUpperCase()}»`,
        };
      }

      const intended = room.currentQuestion.intendedWord
        ? normalizeWord(room.currentQuestion.intendedWord)
        : '';

      // Check if host guessed the intended word
      const isExactMatch = intended && cleanDeflect === intended;

      if (isExactMatch) {
        // EXACT HIT: Deflect succeeded!
        const updates: Partial<Room> = {
          status: 'QUESTION_PHASE',
          currentQuestion: null,
          contactData: null,
          lastDeflectAttempt: null,
          submissions: {},
          historyLog: addLog(
            room.historyLog,
            `🛡️ Ведущий отгадал задуманное слово: «Это не ${deflectWord.toUpperCase()}»! Вопрос снят.`,
            'deflect'
          ),
        };

        await gameStorage.updateRoom(roomId, updates);
        sounds.playDeflect();
        return { success: true, matched: true };
      } else {
        // MISSED: Host said another word starting with prefix. Contact & timer continue!
        const updates: Partial<Room> = {
          lastDeflectAttempt: {
            word: deflectWord.toUpperCase(),
            timestamp: Date.now(),
          },
          historyLog: addLog(
            room.historyLog,
            `🤔 Ведущий предположил «${deflectWord.toUpperCase()}», но это не то! Время тикает!`,
            'deflect_fail'
          ),
        };

        await gameStorage.updateRoom(roomId, updates);
        sounds.playPop();
        return {
          success: true,
          matched: false,
          error: `Не угадали! Автор задумал другое слово на букву «${revealedPrefix.toUpperCase()}». Пробуйте ещё!`,
        };
      }
    },
    [room, roomId, currentUser, addLog]
  );

  // 6b. Author confirms host's deflect (if host named a synonym/valid alternative)
  const acceptDeflect = useCallback(async () => {
    if (!room || !roomId || !currentUser) return;
    if (room.currentQuestion?.authorId !== currentUser.id) {
      throw new Error('Только автор вопроса может подтвердить отбитие');
    }
    const deflectWord = room.lastDeflectAttempt?.word || 'слово ведущего';

    const updates: Partial<Room> = {
      status: 'QUESTION_PHASE',
      currentQuestion: null,
      contactData: null,
      lastDeflectAttempt: null,
      submissions: {},
      historyLog: addLog(
        room.historyLog,
        `🤝 Автор вопроса подтвердил, что «${deflectWord}» подходит! Вопрос снят.`,
        'deflect'
      ),
    };

    await gameStorage.updateRoom(roomId, updates);
    sounds.playDeflect();
  }, [room, roomId, currentUser, addLog]);

  // 7. Evaluate Contact (Instant result when timer expires or host surrenders)
  const evaluateContact = useCallback(async () => {
    if (!room || !roomId) return;
    if (room.status !== 'CONTACT_DECLARED') return;
    if (!room.currentQuestion || !room.contactData) {
      await gameStorage.updateRoom(roomId, {
        status: 'QUESTION_PHASE',
        currentQuestion: null,
        contactData: null,
        submissions: {},
        lastDeflectAttempt: null,
      });
      return;
    }

    const authorId = room.currentQuestion.authorId;
    const authorWord =
      room.submissions?.[authorId] ||
      room.currentQuestion.intendedWord ||
      '';

    const primaryPartnerId = room.contactData.partnerId;
    const allPartnerIds = [
      primaryPartnerId,
      ...(room.contactData.additionalPartners || []).map((p) => p.id),
    ];

    const normAuthor = normalizeWord(authorWord);
    let allMatch = true;
    const detailsList: string[] = [];

    for (const pId of allPartnerIds) {
      const pName =
        room.players?.[pId]?.name ||
        (pId === primaryPartnerId ? room.contactData.partnerName : 'Игрок');
      const pWord = room.submissions?.[pId] || '';
      const normP = normalizeWord(pWord);

      if (!normP || normP !== normAuthor) {
        allMatch = false;
      }
      detailsList.push(`${pName}: «${pWord || '—'}»`);
    }

    if (allMatch && normAuthor) {
      // SUCCESS!
      const nextCount = room.revealedLettersCount + 1;
      const isGameOver = nextCount >= room.secretWord.length;
      const revealedLetter = room.secretWord[nextCount - 1];

      let logMsg = `🎉 КОНТАКТ УСПЕШЕН! Все игроки назвали слово «${authorWord.toUpperCase()}» (${detailsList.join(', ')})! Открыта буква: «${revealedLetter}»!`;
      if (isGameOver) {
        logMsg = `🏆 ПОБЕДА ИГРОКОВ! Открыто всё слово: «${room.secretWord}»!`;
      }

      const updates: Partial<Room> = {
        revealedLettersCount: isGameOver ? room.secretWord.length : nextCount,
        status: isGameOver ? 'GAME_OVER' : 'QUESTION_PHASE',
        winner: isGameOver ? 'players' : null,
        currentQuestion: null,
        contactData: null,
        submissions: {},
        lastDeflectAttempt: null,
        historyLog: addLog(room.historyLog, logMsg, 'match'),
      };

      await gameStorage.updateRoom(roomId, updates);
      if (isGameOver) {
        sounds.playWin();
      } else {
        sounds.playSuccess();
      }
    } else {
      // MISMATCH!
      const failMsg = `❌ Контакт провален! Автор загадал «${authorWord.toUpperCase()}», но ответы игроков не совпали (${detailsList.join(', ')}). По правилам, если кто-то ошибся, контакт не засчитывается! Буква не открыта.`;

      const updates: Partial<Room> = {
        status: 'QUESTION_PHASE',
        currentQuestion: null,
        contactData: null,
        submissions: {},
        lastDeflectAttempt: null,
        historyLog: addLog(room.historyLog, failMsg, 'mismatch'),
      };

      await gameStorage.updateRoom(roomId, updates);
      sounds.playFail();
    }
  }, [room, roomId, addLog]);

  // Host gives up (skips 10s timer)
  const hostGiveUp = useCallback(async () => {
    if (!room || !roomId || !currentUser) return;
    if (currentUser.role !== 'host') return;
    if (room.status !== 'CONTACT_DECLARED') return;

    await evaluateContact();
  }, [room, roomId, currentUser, evaluateContact]);

  // Timer Expired -> Evaluates immediately
  const handleTimerExpired = useCallback(async () => {
    if (!room || !roomId) return;
    if (room.status !== 'CONTACT_DECLARED') return;

    await evaluateContact();
  }, [room, roomId, evaluateContact]);

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
    joinContact,
    hostGiveUp,
    deflect,
    acceptDeflect,
    handleTimerExpired,
    directGuess,
    restartGame,
  };
}
