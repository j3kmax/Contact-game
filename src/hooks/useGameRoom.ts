import { useState, useEffect, useCallback, useRef } from 'react';
import { Room, Player, HistoryItem, GameStatus, PlayerRole } from '../types/game';
import { gameStorage } from '../services/gameStorage';
import { sounds } from '../services/sound';

function normalizeWord(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9]/gi, '');
}

// Helper to advance the turn to the next player (excluding round leader)
function getNextTurn(room: Room): { activePlayerId: string | null; turnOrder: string[] } {
  const leaderId = room.leaderId || room.hostId;
  const currentPlayers = Object.values(room.players || {}).filter((p) => p.id !== leaderId);
  const playerIds = currentPlayers.map((p) => p.id);
  if (playerIds.length === 0) {
    return { activePlayerId: null, turnOrder: [] };
  }

  // Preserve existing order, filter out players who left, add newly joined players
  const existingOrder = (room.turnOrder || []).filter((id) => playerIds.includes(id));
  for (const id of playerIds) {
    if (!existingOrder.includes(id)) {
      existingOrder.push(id);
    }
  }

  const currentActive = room.activePlayerId;
  const currentIndex = existingOrder.indexOf(currentActive || '');
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % existingOrder.length : 0;
  return {
    activePlayerId: existingOrder[nextIndex] || null,
    turnOrder: existingOrder,
  };
}

// Helper to award points
function awardPoints(
  players: Record<string, Player>,
  deltas: Record<string, number>
): Record<string, Player> {
  const nextPlayers = { ...players };
  for (const [id, delta] of Object.entries(deltas)) {
    if (nextPlayers[id]) {
      nextPlayers[id] = {
        ...nextPlayers[id],
        score: Math.max(0, (nextPlayers[id].score || 0) + delta),
      };
    }
  }
  return nextPlayers;
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

  // If user was kicked from room, clear local state
  useEffect(() => {
    if (room && currentUser && room.players && !room.players[currentUser.id]) {
      setCurrentUser(null);
      if (roomId) {
        localStorage.removeItem(`contact_player_${roomId}`);
      }
    }
  }, [room, currentUser, roomId]);

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
    async (name: string, requestedRole: 'host' | 'player' = 'player') => {
      if (!roomId) return;

      const trimmedName = name.trim();
      if (!trimmedName) throw new Error('Пожалуйста, введите ваше имя');

      const existingPlayerId = currentUser?.id || `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const existingScore = room?.players?.[existingPlayerId]?.score || 0;

      if (!room) {
        // First user creates room -> becomes Lobby Host AND initial Round Leader
        const player: Player = {
          id: existingPlayerId,
          name: trimmedName,
          role: 'host',
          score: 0,
          isOnline: true,
          joinedAt: Date.now(),
        };

        const newRoom: Room = {
          roomId,
          hostId: player.id,
          leaderId: player.id,
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
              text: `Комната создана игроком ${trimmedName} (Хост лобби)`,
              type: 'info',
            },
          ],
          createdAt: Date.now(),
        };
        await gameStorage.saveRoom(roomId, newRoom);
        persistUser(player);
        sounds.playPop();
        return;
      }

      // Room exists:
      // If player is leader, role is 'host', otherwise 'player'
      const effectiveLeaderId = room.leaderId || room.hostId;
      const isLeader = existingPlayerId === effectiveLeaderId;
      const actualRole: PlayerRole = isLeader ? 'host' : requestedRole === 'host' && !room.hostId ? 'host' : 'player';

      const player: Player = {
        id: existingPlayerId,
        name: trimmedName,
        role: actualRole,
        score: existingScore,
        isOnline: true,
        joinedAt: Date.now(),
      };

      const updatedPlayers = {
        ...room.players,
        [player.id]: player,
      };

      const updates: Partial<Room> = {
        players: updatedPlayers,
      };

      if (!room.hostId || !room.players[room.hostId]) {
        updates.hostId = player.id;
        updates.leaderId = player.id;
        player.role = 'host';
        updatedPlayers[player.id] = player;
      } else if (!room.leaderId) {
        updates.leaderId = room.hostId;
      }

      const newLogs = addLog(
        room.historyLog,
        `${trimmedName} вошел в игру${player.role === 'host' ? ' (Ведущий)' : ''}`,
        'info'
      );
      updates.historyLog = newLogs;

      await gameStorage.updateRoom(roomId, updates);
      persistUser(player);
      sounds.playPop();
    },
    [roomId, room, currentUser, addLog]
  );

  // 1b. Kick Player (Lobby Host only)
  const kickPlayer = useCallback(
    async (playerId: string) => {
      if (!room || !roomId || !currentUser) return;
      if (room.hostId !== currentUser.id) {
        throw new Error('Только создатель (хост) лобби может исключать игроков');
      }
      if (playerId === currentUser.id) {
        throw new Error('Хост не может исключить сам себя');
      }

      const kickedName = room.players?.[playerId]?.name || 'Игрок';
      const updatedPlayers = { ...room.players };
      delete updatedPlayers[playerId];

      const newTurnOrder = (room.turnOrder || []).filter((id) => id !== playerId);
      let newActivePlayerId = room.activePlayerId;
      if (newActivePlayerId === playerId) {
        newActivePlayerId = newTurnOrder[0] || null;
      }

      const updates: Partial<Room> = {
        players: updatedPlayers,
        turnOrder: newTurnOrder,
        activePlayerId: newActivePlayerId,
      };

      // If kicked player was leader, reassign leader to host
      if (room.leaderId === playerId) {
        updates.leaderId = room.hostId;
        if (updatedPlayers[room.hostId]) {
          updatedPlayers[room.hostId] = {
            ...updatedPlayers[room.hostId],
            role: 'host',
          };
        }
      }

      // If kicked player had active question, cancel question
      if (room.currentQuestion?.authorId === playerId) {
        updates.currentQuestion = null;
        updates.contactData = null;
        updates.status = 'QUESTION_PHASE';
      }

      // If kicked player was primary contact partner
      if (room.contactData?.partnerId === playerId) {
        updates.contactData = null;
        updates.status = 'QUESTION_PHASE';
      } else if (room.contactData?.additionalPartners?.some((p) => p.id === playerId)) {
        updates.contactData = {
          ...room.contactData,
          additionalPartners: room.contactData.additionalPartners.filter((p) => p.id !== playerId),
        };
      }

      // Clean submissions
      if (room.submissions?.[playerId]) {
        const newSubs = { ...room.submissions };
        delete newSubs[playerId];
        updates.submissions = newSubs;
      }

      // Clean cooldowns
      if (room.directGuessCooldowns?.[playerId]) {
        const newCooldowns = { ...room.directGuessCooldowns };
        delete newCooldowns[playerId];
        updates.directGuessCooldowns = newCooldowns;
      }

      updates.historyLog = addLog(
        room.historyLog,
        `🚫 Хост исключил игрока ${kickedName} из комнаты.`,
        'info'
      );

      await gameStorage.updateRoom(roomId, updates);
      sounds.playPop();
    },
    [room, roomId, currentUser, addLog]
  );

  // 1c. Transfer Lobby Host (Host only)
  const transferLobbyHost = useCallback(
    async (newHostId: string) => {
      if (!room || !roomId || !currentUser) return;
      if (room.hostId !== currentUser.id) {
        throw new Error('Только текущий хост может передать права управления');
      }
      if (!room.players?.[newHostId]) {
        throw new Error('Выбранный игрок не найден в комнате');
      }

      const targetName = room.players[newHostId].name;
      const updates: Partial<Room> = {
        hostId: newHostId,
        historyLog: addLog(
          room.historyLog,
          `👑 Права хоста лобби переданы игроку ${targetName}!`,
          'info'
        ),
      };

      await gameStorage.updateRoom(roomId, updates);
      sounds.playPop();
    },
    [room, roomId, currentUser, addLog]
  );

  // 1d. Assign Round Leader / Word Master (Host only)
  const setRoundLeader = useCallback(
    async (newLeaderId: string) => {
      if (!room || !roomId || !currentUser) return;
      if (room.hostId !== currentUser.id) {
        throw new Error('Только хост лобби может назначать ведущего на раунд');
      }
      if (!room.players?.[newLeaderId]) {
        throw new Error('Выбранный игрок не найден в комнате');
      }

      const updatedPlayers: Record<string, Player> = {};
      for (const [id, p] of Object.entries(room.players)) {
        updatedPlayers[id] = {
          ...p,
          role: id === newLeaderId ? 'host' : 'player',
        };
      }

      const targetName = room.players[newLeaderId].name;
      const updates: Partial<Room> = {
        leaderId: newLeaderId,
        players: updatedPlayers,
        historyLog: addLog(
          room.historyLog,
          `🎯 Ведущим на этот раунд назначен: ${targetName}!`,
          'info'
        ),
      };

      await gameStorage.updateRoom(roomId, updates);
      sounds.playPop();
    },
    [room, roomId, currentUser, addLog]
  );

  // 2. Start Game (Round Leader or Host)
  const startGame = useCallback(
    async (secretWord: string) => {
      if (!room || !roomId || !currentUser) return;
      const effectiveLeaderId = room.leaderId || room.hostId;
      const isLeaderOrHost = currentUser.id === effectiveLeaderId || currentUser.id === room.hostId;
      if (!isLeaderOrHost) {
        throw new Error('Только ведущий раунда или хост комнаты может начать игру');
      }

      const cleanWord = secretWord.trim().toUpperCase();
      if (!/^[А-ЯЁ]{3,}$/i.test(cleanWord)) {
        throw new Error('Слово должно состоять только из русских букв (минимум 3 буквы)');
      }

      // Set roles: effectiveLeaderId is 'host', other players are 'player'
      const updatedPlayers: Record<string, Player> = {};
      for (const [id, p] of Object.entries(room.players || {})) {
        updatedPlayers[id] = {
          ...p,
          role: id === effectiveLeaderId ? 'host' : 'player',
        };
      }

      const playerIds = Object.values(updatedPlayers)
        .filter((p) => p.role === 'player')
        .map((p) => p.id);
      const initialActivePlayerId = playerIds.length > 0 ? playerIds[0] : null;

      const firstLetter = cleanWord[0];
      const leaderName = updatedPlayers[effectiveLeaderId]?.name || 'Ведущий';

      const updates: Partial<Room> = {
        secretWord: cleanWord,
        revealedLettersCount: 1,
        status: 'QUESTION_PHASE',
        currentQuestion: null,
        contactData: null,
        submissions: {},
        directGuessCooldowns: {},
        leaderId: effectiveLeaderId,
        players: updatedPlayers,
        activePlayerId: initialActivePlayerId,
        turnOrder: playerIds,
        winner: null,
        historyLog: addLog(
          room.historyLog,
          `🎯 Ведущий (${leaderName}) загадал слово из ${cleanWord.length} букв. Первая буква: «${firstLetter}»! Игра началась!`,
          'info'
        ),
      };

      await gameStorage.updateRoom(roomId, updates);
      sounds.playSuccess();
    },
    [room, roomId, currentUser, addLog]
  );

  // 3. Ask Question (Voice hint in Discord, single secret intended word input)
  const askQuestion = useCallback(
    async (intendedWord: string, text?: string) => {
      if (!room || !roomId || !currentUser) return;
      const effectiveLeaderId = room.leaderId || room.hostId;
      if (currentUser.id === effectiveLeaderId) {
        throw new Error('Ведущий не может задавать вопросы');
      }
      if (room.status !== 'QUESTION_PHASE') {
        throw new Error('Сейчас нельзя задать вопрос');
      }

      // Check turn: only activePlayer can ask if activePlayerId is set
      if (room.activePlayerId && room.activePlayerId !== currentUser.id) {
        const activePlayerName = room.players?.[room.activePlayerId]?.name || 'другого игрока';
        throw new Error(`Сейчас очередь загадывать намёк у игрока ${activePlayerName}`);
      }

      const cleanIntended = intendedWord.trim().toUpperCase();
      if (!cleanIntended || cleanIntended.length < 2) {
        throw new Error('Пожалуйста, укажите загаданное вами слово (секретно)');
      }

      const revealedPrefix = normalizeWord(room.secretWord.slice(0, room.revealedLettersCount));
      const normIntended = normalizeWord(cleanIntended);

      if (!normIntended.startsWith(revealedPrefix)) {
        throw new Error(`Задуманное слово должно начинаться на открытые буквы: «${revealedPrefix.toUpperCase()}»`);
      }

      const cleanText = (text && text.trim()) || 'Голосовой намёк в Discord';

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
          `🎙️ ${currentUser.name} загадал слово и озвучивает намёк в Discord!`,
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
    const effectiveLeaderId = room.leaderId || room.hostId;
    if (
      currentUser.id !== room.hostId &&
      currentUser.id !== effectiveLeaderId &&
      room.currentQuestion?.authorId !== currentUser.id
    ) {
      return;
    }

    const { activePlayerId, turnOrder } = getNextTurn(room);
    const nextName = activePlayerId ? (room.players?.[activePlayerId]?.name || 'следующего игрока') : 'следующего игрока';

    const updates: Partial<Room> = {
      currentQuestion: null,
      contactData: null,
      lastDeflectAttempt: null,
      submissions: {},
      status: 'QUESTION_PHASE',
      activePlayerId,
      turnOrder,
      historyLog: addLog(
        room.historyLog,
        `Вопрос был отменен. Очередь переходит к ${nextName}.`,
        'info'
      ),
    };

    await gameStorage.updateRoom(roomId, updates);
  }, [room, roomId, currentUser, addLog]);

  // 4b. Skip Turn (Active player passes turn to next player)
  const skipTurn = useCallback(async () => {
    if (!room || !roomId || !currentUser) return;
    if (room.status !== 'QUESTION_PHASE' || room.currentQuestion) {
      throw new Error('Нельзя пропустить ход во время активного вопроса или контакта');
    }
    const effectiveLeaderId = room.leaderId || room.hostId;
    if (
      currentUser.id !== room.hostId &&
      currentUser.id !== effectiveLeaderId &&
      room.activePlayerId &&
      room.activePlayerId !== currentUser.id
    ) {
      throw new Error('Только текущий активный игрок, ведущий или хост может пропустить ход');
    }

    const { activePlayerId, turnOrder } = getNextTurn(room);
    const nextName = activePlayerId ? (room.players?.[activePlayerId]?.name || 'следующего игрока') : 'следующего игрока';

    const updates: Partial<Room> = {
      activePlayerId,
      turnOrder,
      historyLog: addLog(
        room.historyLog,
        `⏭️ ${currentUser.name} передал свой ход. Теперь очередь загадывать у ${nextName}.`,
        'info',
        currentUser.name
      ),
    };

    await gameStorage.updateRoom(roomId, updates);
    sounds.playPop();
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
      const effectiveLeaderId = room.leaderId || room.hostId;
      if (currentUser.id === effectiveLeaderId) {
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
      const effectiveLeaderId = room.leaderId || room.hostId;
      if (currentUser.id === effectiveLeaderId) return;
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

  // 6. Host / Round Leader Deflects ("Это не...")
  const deflect = useCallback(
    async (deflectWord: string): Promise<{ success: boolean; matched: boolean; error?: string }> => {
      if (!room || !roomId || !currentUser) return { success: false, matched: false, error: 'Нет подключения' };
      const effectiveLeaderId = room.leaderId || room.hostId;
      if (currentUser.id !== effectiveLeaderId) {
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
        // EXACT HIT: Deflect succeeded! +10 points to round leader
        const scoreDeltas: Record<string, number> = {};
        scoreDeltas[effectiveLeaderId] = 10;
        const updatedPlayers = awardPoints(room.players || {}, scoreDeltas);
        const { activePlayerId, turnOrder } = getNextTurn(room);
        const nextName = activePlayerId ? (room.players?.[activePlayerId]?.name || 'следующего игрока') : 'следующего игрока';

        const updates: Partial<Room> = {
          status: 'QUESTION_PHASE',
          currentQuestion: null,
          contactData: null,
          lastDeflectAttempt: null,
          submissions: {},
          players: updatedPlayers,
          activePlayerId,
          turnOrder,
          historyLog: addLog(
            room.historyLog,
            `🛡️ Ведущий отгадал задуманное слово: «Это не ${deflectWord.toUpperCase()}»! (+10 очков ведущему) Вопрос снят. Очередь переходит к ${nextName}.`,
            'deflect'
          ),
        };

        await gameStorage.updateRoom(roomId, updates);
        sounds.playDeflect();
        return { success: true, matched: true };
      } else {
        // MISSED: Host named another word starting with prefix. Contact & timer continue!
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
    const effectiveLeaderId = room.leaderId || room.hostId;
    const deflectWord = room.lastDeflectAttempt?.word || 'слово ведущего';

    const scoreDeltas: Record<string, number> = {};
    if (effectiveLeaderId) {
      scoreDeltas[effectiveLeaderId] = 10;
    }
    const updatedPlayers = awardPoints(room.players || {}, scoreDeltas);
    const { activePlayerId, turnOrder } = getNextTurn(room);
    const nextName = activePlayerId ? (room.players?.[activePlayerId]?.name || 'следующего игрока') : 'следующего игрока';

    const updates: Partial<Room> = {
      status: 'QUESTION_PHASE',
      currentQuestion: null,
      contactData: null,
      lastDeflectAttempt: null,
      submissions: {},
      players: updatedPlayers,
      activePlayerId,
      turnOrder,
      historyLog: addLog(
        room.historyLog,
        `🤝 Автор вопроса подтвердил, что «${deflectWord}» подходит! (+10 очков ведущему) Вопрос снят. Очередь переходит к ${nextName}.`,
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
      const { activePlayerId, turnOrder } = getNextTurn(room);
      await gameStorage.updateRoom(roomId, {
        status: 'QUESTION_PHASE',
        currentQuestion: null,
        contactData: null,
        submissions: {},
        lastDeflectAttempt: null,
        activePlayerId,
        turnOrder,
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

      // Points: Author +10, Primary Partner +10, Additional Partners +5 each
      const scoreDeltas: Record<string, number> = {};
      scoreDeltas[authorId] = (scoreDeltas[authorId] || 0) + 10;
      scoreDeltas[primaryPartnerId] = (scoreDeltas[primaryPartnerId] || 0) + 10;
      for (const p of room.contactData.additionalPartners || []) {
        scoreDeltas[p.id] = (scoreDeltas[p.id] || 0) + 5;
      }
      const updatedPlayers = awardPoints(room.players || {}, scoreDeltas);
      const { activePlayerId, turnOrder } = getNextTurn(room);
      const nextName = activePlayerId ? (room.players?.[activePlayerId]?.name || 'следующего игрока') : 'следующего игрока';

      let logMsg = `🎉 КОНТАКТ УСПЕШЕН! Все игроки назвали слово «${authorWord.toUpperCase()}» (${detailsList.join(', ')})! Открыта буква: «${revealedLetter}»! Автор (+10), Партнёр (+10)${(room.contactData.additionalPartners || []).length > 0 ? ', Поддержавшие (+5)' : ''}. Очередь переходит к ${nextName}.`;
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
        players: updatedPlayers,
        activePlayerId,
        turnOrder,
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
      // Notice: Host receives NO points on player contact mismatch as requested
      const { activePlayerId, turnOrder } = getNextTurn(room);
      const nextName = activePlayerId ? (room.players?.[activePlayerId]?.name || 'следующего игрока') : 'следующего игрока';

      const failMsg = `❌ Контакт не состоялся! Автор загадал «${authorWord.toUpperCase()}», но ответы игроков разошлись (${detailsList.join(', ')}). Буква не открыта. Очередь переходит к ${nextName}.`;

      const updates: Partial<Room> = {
        status: 'QUESTION_PHASE',
        currentQuestion: null,
        contactData: null,
        submissions: {},
        lastDeflectAttempt: null,
        activePlayerId,
        turnOrder,
        historyLog: addLog(room.historyLog, failMsg, 'mismatch'),
      };

      await gameStorage.updateRoom(roomId, updates);
      sounds.playFail();
    }
  }, [room, roomId, addLog]);

  // Host gives up (skips 10s timer)
  const hostGiveUp = useCallback(async () => {
    if (!room || !roomId || !currentUser) return;
    const effectiveLeaderId = room.leaderId || room.hostId;
    if (currentUser.id !== effectiveLeaderId && currentUser.id !== room.hostId) return;
    if (room.status !== 'CONTACT_DECLARED') return;

    await evaluateContact();
  }, [room, roomId, currentUser, evaluateContact]);

  // Timer Expired -> Evaluates immediately
  const handleTimerExpired = useCallback(async () => {
    if (!room || !roomId) return;
    if (room.status !== 'CONTACT_DECLARED') return;

    await evaluateContact();
  }, [room, roomId, evaluateContact]);

  // 9. Direct Guess (Any player guesses entire word, 1 attempt per 30s)
  const directGuess = useCallback(
    async (word: string): Promise<{ correct: boolean; message: string }> => {
      if (!room || !roomId || !currentUser) return { correct: false, message: 'Нет подключения к комнате' };

      const effectiveLeaderId = room.leaderId || room.hostId;
      if (currentUser.id === effectiveLeaderId) {
        return { correct: false, message: 'Ведущий не может отгадывать собственное тайное слово' };
      }

      // Check 30s cooldown
      const now = Date.now();
      const cooldownUntil = room.directGuessCooldowns?.[currentUser.id] || 0;
      if (now < cooldownUntil) {
        const remainingSec = Math.ceil((cooldownUntil - now) / 1000);
        return {
          correct: false,
          message: `Перезарядка! Подождите еще ${remainingSec} сек. перед следующей попыткой.`,
        };
      }

      const cleanGuess = normalizeWord(word);
      const cleanSecret = normalizeWord(room.secretWord);

      if (cleanGuess === cleanSecret) {
        // Player won! +25 points
        const scoreDeltas: Record<string, number> = {};
        scoreDeltas[currentUser.id] = 25;
        const updatedPlayers = awardPoints(room.players || {}, scoreDeltas);

        const updates: Partial<Room> = {
          revealedLettersCount: room.secretWord.length,
          status: 'GAME_OVER',
          winner: 'players',
          players: updatedPlayers,
          historyLog: addLog(
            room.historyLog,
            `🌟 БИНГО! ${currentUser.name} назвал слово целиком: «${room.secretWord}»! (+25 очков!) ПОБЕДА ИГРОКОВ!`,
            'win',
            currentUser.name
          ),
        };
        await gameStorage.updateRoom(roomId, updates);
        sounds.playWin();
        return { correct: true, message: 'Поздравляем! Вы угадали всё слово!' };
      } else {
        // Wrong guess: apply 30-second cooldown
        const nextCooldowns = {
          ...(room.directGuessCooldowns || {}),
          [currentUser.id]: now + 30000,
        };

        const updates: Partial<Room> = {
          directGuessCooldowns: nextCooldowns,
          historyLog: addLog(
            room.historyLog,
            `⚠️ ${currentUser.name} попытался назвать всё слово «${word.toUpperCase()}», но не угадал! (Перезарядка 30 сек.)`,
            'guess',
            currentUser.name
          ),
        };
        await gameStorage.updateRoom(roomId, updates);
        sounds.playFail();
        return { correct: false, message: `Слово «${word.toUpperCase()}» неверно! Перезарядка 30 секунд.` };
      }
    },
    [room, roomId, currentUser, addLog]
  );

  // 10. Restart Game (Lobby Host or Round Leader, keeps accumulated scores)
  const restartGame = useCallback(async () => {
    if (!room || !roomId || !currentUser) return;
    const effectiveLeaderId = room.leaderId || room.hostId;
    const isHostOrLeader = currentUser.id === room.hostId || currentUser.id === effectiveLeaderId;
    if (!isHostOrLeader) {
      throw new Error('Только хост лобби или ведущий может перезапустить игру');
    }

    const playerIds = Object.values(room.players || {})
      .filter((p) => p.id !== effectiveLeaderId)
      .map((p) => p.id);

    const updates: Partial<Room> = {
      status: 'LOBBY',
      secretWord: '',
      revealedLettersCount: 1,
      currentQuestion: null,
      contactData: null,
      submissions: {},
      lastDeflectAttempt: null,
      directGuessCooldowns: {},
      activePlayerId: playerIds[0] || null,
      turnOrder: playerIds,
      winner: null,
      historyLog: addLog(room.historyLog, `Раунд завершен. Игра возвращена в лобби для нового раунда. Баллы сохранены!`, 'info'),
    };

    await gameStorage.updateRoom(roomId, updates);
    sounds.playPop();
  }, [room, roomId, currentUser, addLog]);

  return {
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
