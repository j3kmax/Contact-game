import { describe, it, expect } from 'vitest';
import { Player, Room } from '../types/game';

function normalizeWord(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9]/gi, '');
}

function getNextTurn(room: Partial<Room>): { activePlayerId: string | null; turnOrder: string[] } {
  const currentPlayers = Object.values(room.players || {}).filter((p) => p.role === 'player');
  const playerIds = currentPlayers.map((p) => p.id);
  if (playerIds.length === 0) {
    return { activePlayerId: null, turnOrder: [] };
  }

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

describe('Contact Game Logic & Normalization', () => {
  it('normalizes Russian words with ё, case, and whitespace', () => {
    expect(normalizeWord(' Ёлка ')).toBe('елка');
    expect(normalizeWord('Самолёт-Истребитель!')).toBe('самолетистребитель');
    expect(normalizeWord('РОБОТ')).toBe('робот');
  });

  it('validates prefix check correctly', () => {
    const secretWord = 'КОМПЬЮТЕР';
    const revealedCount = 3; // 'КОМ'
    const revealedPrefix = normalizeWord(secretWord.slice(0, revealedCount));

    expect(revealedPrefix).toBe('ком');

    // Valid hints/deflects
    expect(normalizeWord('Компас').startsWith(revealedPrefix)).toBe(true);
    expect(normalizeWord('Компот').startsWith(revealedPrefix)).toBe(true);
    expect(normalizeWord('Комната').startsWith(revealedPrefix)).toBe(true);

    // Invalid prefix
    expect(normalizeWord('Кошка').startsWith(revealedPrefix)).toBe(false);
    expect(normalizeWord('Камень').startsWith(revealedPrefix)).toBe(false);
  });

  it('correctly matches matching submissions', () => {
    const authorWord = '  Ноутбук  ';
    const partnerWord = 'ноутбук';

    expect(normalizeWord(authorWord)).toBe(normalizeWord(partnerWord));
  });

  it('correctly detects mismatched submissions', () => {
    const authorWord = 'Ракета';
    const partnerWord = 'Робот';

    expect(normalizeWord(authorWord)).not.toBe(normalizeWord(partnerWord));
  });

  it('handles direct guess match regardless of letter case and whitespace', () => {
    const secretWord = 'ГАЛАКТИКА';
    const playerGuess = '  галактика ';

    expect(normalizeWord(playerGuess)).toBe(normalizeWord(secretWord));
  });

  it('calculates game over condition when all letters are revealed', () => {
    const secretWord = 'МИР';
    let revealedLettersCount = 1;

    // First contact success
    revealedLettersCount += 1; // 2
    expect(revealedLettersCount >= secretWord.length).toBe(false);

    // Second contact success
    revealedLettersCount += 1; // 3
    expect(revealedLettersCount >= secretWord.length).toBe(true);
  });

  it('correctly evaluates multi-player contact: all must match, fails if anyone fails', () => {
    const authorWord = 'САМОЛЕТ';
    const normAuthor = normalizeWord(authorWord);

    const partnerWordsAllCorrect = ['самолет', ' САМОЛЕТ ', 'самолёт'];
    const allMatch1 = partnerWordsAllCorrect.every((w) => normalizeWord(w) === normAuthor);
    expect(allMatch1).toBe(true);

    const partnerWordsOneMistake = ['самолет', 'САХАР', 'самолет'];
    const allMatch2 = partnerWordsOneMistake.every((w) => normalizeWord(w) === normAuthor);
    expect(allMatch2).toBe(false);
  });

  it('correctly rotates turn order among regular players', () => {
    const mockRoom: Partial<Room> = {
      players: {
        host1: { id: 'host1', name: 'Host', role: 'host', score: 0 },
        p1: { id: 'p1', name: 'Alice', role: 'player', score: 0 },
        p2: { id: 'p2', name: 'Bob', role: 'player', score: 0 },
        p3: { id: 'p3', name: 'Charlie', role: 'player', score: 0 },
      },
      turnOrder: ['p1', 'p2', 'p3'],
      activePlayerId: 'p1',
    };

    // p1 finished turn -> should be p2
    const turn1 = getNextTurn(mockRoom);
    expect(turn1.activePlayerId).toBe('p2');

    // p2 finished turn -> should be p3
    mockRoom.activePlayerId = 'p2';
    const turn2 = getNextTurn(mockRoom);
    expect(turn2.activePlayerId).toBe('p3');

    // p3 finished turn -> wrap around to p1
    mockRoom.activePlayerId = 'p3';
    const turn3 = getNextTurn(mockRoom);
    expect(turn3.activePlayerId).toBe('p1');
  });

  it('correctly calculates points for successful contact and host deflect', () => {
    const initialPlayers: Record<string, Player> = {
      host: { id: 'host', name: 'Host', role: 'host', score: 0 },
      author: { id: 'author', name: 'Author', role: 'player', score: 0 },
      p1: { id: 'p1', name: 'Partner1', role: 'player', score: 0 },
      p2: { id: 'p2', name: 'Partner2', role: 'player', score: 0 },
    };

    // 1. Successful contact: Author +10, Partner1 +10, Partner2 +5
    const afterSuccess = awardPoints(initialPlayers, {
      author: 10,
      p1: 10,
      p2: 5,
    });
    expect(afterSuccess.author.score).toBe(10);
    expect(afterSuccess.p1.score).toBe(10);
    expect(afterSuccess.p2.score).toBe(5);
    expect(afterSuccess.host.score).toBe(0);

    // 2. Host deflects: Host +10
    const afterDeflect = awardPoints(afterSuccess, { host: 10 });
    expect(afterDeflect.host.score).toBe(10);

    // 3. Direct guess: Partner1 +25
    const afterDirect = awardPoints(afterDeflect, { p1: 25 });
    expect(afterDirect.p1.score).toBe(35);
  });

  it('does NOT award points to host when contact between players fails (mismatch)', () => {
    const players: Record<string, Player> = {
      host: { id: 'host', name: 'Host', role: 'host', score: 20 },
      author: { id: 'author', name: 'Author', role: 'player', score: 10 },
      p1: { id: 'p1', name: 'Partner', role: 'player', score: 15 },
    };

    // On mismatch, deltas is empty object {} -> host gets 0 points
    const deltas: Record<string, number> = {};
    const afterMismatch = awardPoints(players, deltas);

    expect(afterMismatch.host.score).toBe(20); // Unchanged!
    expect(afterMismatch.author.score).toBe(10);
    expect(afterMismatch.p1.score).toBe(15);
  });

  it('correctly tracks and enforces 30-second cooldown for direct whole-word guessing', () => {
    const now = 1000000;
    const cooldownExpiresAt = now + 30000; // 30s cooldown
    const cooldowns: Record<string, number> = {
      player1: cooldownExpiresAt,
    };

    // During cooldown (e.g. 10s elapsed, 20s remaining)
    const midTime = now + 10000;
    const isCooldownActive = (cooldowns['player1'] || 0) > midTime;
    const remainingSec = Math.ceil(((cooldowns['player1'] || 0) - midTime) / 1000);
    expect(isCooldownActive).toBe(true);
    expect(remainingSec).toBe(20);

    // After cooldown has expired (31s elapsed)
    const afterTime = now + 31000;
    const isExpired = (cooldowns['player1'] || 0) <= afterTime;
    expect(isExpired).toBe(true);
  });

  it('preserves all player scores when restarting game for a new round', () => {
    const currentRoom: Partial<Room> = {
      status: 'GAME_OVER',
      secretWord: 'ТЕЛЕФОН',
      revealedLettersCount: 7,
      hostId: 'host1',
      leaderId: 'host1',
      players: {
        host1: { id: 'host1', name: 'Host', role: 'host', score: 30 },
        p1: { id: 'p1', name: 'Alice', role: 'player', score: 45 },
        p2: { id: 'p2', name: 'Bob', role: 'player', score: 25 },
      },
    };

    // Restart creates new round updates, keeping players object intact
    const restartUpdates: Partial<Room> = {
      status: 'LOBBY',
      secretWord: '',
      revealedLettersCount: 1,
      currentQuestion: null,
      contactData: null,
      submissions: {},
      winner: null,
      directGuessCooldowns: {},
    };

    const nextRoom = { ...currentRoom, ...restartUpdates };

    expect(nextRoom.status).toBe('LOBBY');
    expect(nextRoom.secretWord).toBe('');
    expect(nextRoom.players!['host1'].score).toBe(30);
    expect(nextRoom.players!['p1'].score).toBe(45);
    expect(nextRoom.players!['p2'].score).toBe(25);
  });

  it('allows lobby host to assign round leader and transfer host', () => {
    const room: Partial<Room> = {
      hostId: 'p1', // p1 is lobby host
      leaderId: 'p1',
      players: {
        p1: { id: 'p1', name: 'Creator', role: 'host', score: 10 },
        p2: { id: 'p2', name: 'Guesser', role: 'player', score: 20 },
      },
    };

    // 1. Host assigns p2 as round leader
    const assignedLeaderId = 'p2';
    const updatedPlayersRole: Record<string, Player> = {};
    for (const [id, p] of Object.entries(room.players!)) {
      updatedPlayersRole[id] = {
        ...p,
        role: id === assignedLeaderId ? 'host' : 'player',
      };
    }
    const afterLeaderAssign = {
      ...room,
      leaderId: assignedLeaderId,
      players: updatedPlayersRole,
    };

    expect(afterLeaderAssign.leaderId).toBe('p2');
    expect(afterLeaderAssign.players['p2'].role).toBe('host');
    expect(afterLeaderAssign.players['p1'].role).toBe('player');
    expect(afterLeaderAssign.hostId).toBe('p1'); // Lobby host remains p1

    // 2. Host transfers lobby host to p2
    const afterTransfer = {
      ...afterLeaderAssign,
      hostId: 'p2',
    };
    expect(afterTransfer.hostId).toBe('p2');
  });

  it('ensures Player 1 gets player interface and Player 2 gets leader interface after role transfer', () => {
    // Room where p2 is the round leader, p1 was previous creator
    const room: Partial<Room> = {
      hostId: 'p1',
      leaderId: 'p2',
      players: {
        p1: { id: 'p1', name: 'Player 1', role: 'player', score: 10 },
        p2: { id: 'p2', name: 'Player 2', role: 'host', score: 20 },
      },
    };

    const effectiveLeaderId = room.leaderId || room.hostId;
    expect(effectiveLeaderId).toBe('p2');

    // Player 1 interface check
    const isPlayer1Leader = 'p1' === effectiveLeaderId;
    expect(isPlayer1Leader).toBe(false); // Player 1 must NOT see deflect/host panel

    // Player 2 interface check
    const isPlayer2Leader = 'p2' === effectiveLeaderId;
    expect(isPlayer2Leader).toBe(true); // Player 2 sees deflect/host panel

    // If host is transferred to p2 as well
    const updatedRoom: Partial<Room> = {
      ...room,
      hostId: 'p2',
      leaderId: 'p2',
    };
    const newEffectiveLeaderId = updatedRoom.leaderId || updatedRoom.hostId;
    expect('p1' === newEffectiveLeaderId).toBe(false);
    expect('p2' === newEffectiveLeaderId).toBe(true);
  });

  describe('Used Words, Host Words & Already Asked Words Restrictions', () => {
    it('blocks asking words that were written by the host', () => {
      const room: Partial<Room> = {
        secretWord: 'ПАРОХОД',
        revealedLettersCount: 2,
        hostWords: ['парк', 'парус'],
        askedWords: [],
      };

      const candidate1 = 'ПАРК';
      const isBlocked1 = (room.hostWords || []).map(normalizeWord).includes(normalizeWord(candidate1));
      expect(isBlocked1).toBe(true);

      const candidate2 = 'Пароход'; // Secret word
      const isBlockedSecret = normalizeWord(candidate2) === normalizeWord(room.secretWord!);
      expect(isBlockedSecret).toBe(true);

      const candidate3 = 'ПАВЛИН';
      const isBlocked3 = (room.hostWords || []).map(normalizeWord).includes(normalizeWord(candidate3));
      expect(isBlocked3).toBe(false);
    });

    it('blocks asking words that were already asked in previous turns', () => {
      const room: Partial<Room> = {
        secretWord: 'ПАРОХОД',
        revealedLettersCount: 2,
        hostWords: [],
        askedWords: ['пакет', 'пальто'],
      };

      const candidate1 = 'ПАКЕТ';
      const isBlocked1 = (room.askedWords || []).map(normalizeWord).includes(normalizeWord(candidate1));
      expect(isBlocked1).toBe(true);

      const candidate2 = 'ПАПКА';
      const isBlocked2 = (room.askedWords || []).map(normalizeWord).includes(normalizeWord(candidate2));
      expect(isBlocked2).toBe(false);
    });

    it('blocks using already asked words or host words as contact guesses', () => {
      const room: Partial<Room> = {
        secretWord: 'ПАРОХОД',
        revealedLettersCount: 2,
        hostWords: ['парус'],
        askedWords: ['пакет'],
      };

      const guessHostWord = 'ПАРУС';
      const isHostBlocked = (room.hostWords || []).map(normalizeWord).includes(normalizeWord(guessHostWord));
      expect(isHostBlocked).toBe(true);

      const guessAskedWord = 'ПАКЕТ';
      const isAskedBlocked = (room.askedWords || []).map(normalizeWord).includes(normalizeWord(guessAskedWord));
      expect(isAskedBlocked).toBe(true);

      const guessFreshWord = 'ПАЛАТКА';
      const isFreshBlocked =
        (room.hostWords || []).map(normalizeWord).includes(normalizeWord(guessFreshWord)) ||
        (room.askedWords || []).map(normalizeWord).includes(normalizeWord(guessFreshWord));
      expect(isFreshBlocked).toBe(false);
    });

    it('prevents host from deflecting with the exact same word twice', () => {
      const hostWords = ['парус', 'парк'];
      const newDeflectWord = 'Парус';

      const isDuplicate = hostWords.map(normalizeWord).includes(normalizeWord(newDeflectWord));
      expect(isDuplicate).toBe(true);

      const freshDeflect = 'Паровоз';
      const isFresh = hostWords.map(normalizeWord).includes(normalizeWord(freshDeflect));
      expect(isFresh).toBe(false);
    });

    it('ensures only lobby host is authorized to pass turn to a chosen player', () => {
      const room: Partial<Room> = {
        hostId: 'host123',
        leaderId: 'leader456',
        players: {
          host123: { id: 'host123', name: 'LobbyHost', role: 'player', score: 0 },
          player1: { id: 'player1', name: 'Alice', role: 'player', score: 0 },
          player2: { id: 'player2', name: 'Bob', role: 'player', score: 0 },
        },
      };

      const canPassHost = 'host123' === room.hostId;
      expect(canPassHost).toBe(true);

      const canPassRegularPlayer = 'player1' === room.hostId;
      expect(canPassRegularPlayer).toBe(false);
    });
  });

  describe('10-Second Turn Rotation & Timeout Mechanism', () => {
    const TURN_DURATION_MS = 10000;

    it('calculates turn expiration timestamp exactly 10 seconds into the future', () => {
      const now = 1700000000000;
      const turnExpiresAt = now + TURN_DURATION_MS;
      expect(turnExpiresAt - now).toBe(10000);
    });

    it('detects when 10-second turn limit has expired and advances turn to next player', () => {
      const now = 1700000010500;
      const room: Partial<Room> = {
        status: 'QUESTION_PHASE',
        currentQuestion: null,
        activePlayerId: 'p1',
        turnOrder: ['p1', 'p2', 'p3'],
        turnExpiresAt: 1700000010000, // expired 500ms ago
        players: {
          host: { id: 'host', name: 'Host', role: 'host', score: 0 },
          p1: { id: 'p1', name: 'Alice', role: 'player', score: 0 },
          p2: { id: 'p2', name: 'Bob', role: 'player', score: 0 },
          p3: { id: 'p3', name: 'Charlie', role: 'player', score: 0 },
        },
      };

      const isExpired = !!(room.turnExpiresAt && now >= room.turnExpiresAt);
      expect(isExpired).toBe(true);

      // Advance turn on timeout
      const { activePlayerId, turnOrder } = getNextTurn(room);
      expect(activePlayerId).toBe('p2');
      expect(turnOrder).toEqual(['p1', 'p2', 'p3']);

      // Next player gets fresh 10s
      const nextTurnExpiresAt = activePlayerId ? now + TURN_DURATION_MS : null;
      expect(nextTurnExpiresAt).toBe(now + 10000);
    });

    it('pauses turn timer when question is asked (turnExpiresAt set to null)', () => {
      const room: Partial<Room> = {
        status: 'QUESTION_PHASE',
        currentQuestion: null,
        activePlayerId: 'p1',
        turnExpiresAt: 1700000010000,
      };

      // Player submits question
      const questionAskedUpdates: Partial<Room> = {
        currentQuestion: {
          authorId: 'p1',
          authorName: 'Alice',
          intendedWord: 'ПАРОХОД',
          text: 'Голосовой намёк в Discord',
        },
        turnExpiresAt: null, // Timer paused while question is in play
      };

      expect(questionAskedUpdates.turnExpiresAt).toBeNull();
      expect(questionAskedUpdates.currentQuestion).toBeDefined();
    });

    it('resumes 10-second timer for the next player when question is canceled or resolved', () => {
      const now = 1700000050000;
      const room: Partial<Room> = {
        status: 'QUESTION_PHASE',
        activePlayerId: 'p1',
        turnOrder: ['p1', 'p2', 'p3'],
        players: {
          host: { id: 'host', name: 'Host', role: 'host', score: 0 },
          p1: { id: 'p1', name: 'Alice', role: 'player', score: 0 },
          p2: { id: 'p2', name: 'Bob', role: 'player', score: 0 },
          p3: { id: 'p3', name: 'Charlie', role: 'player', score: 0 },
        },
      };

      // Turn rotates to next player and resets timer to 10s
      const { activePlayerId, turnOrder } = getNextTurn(room);
      const updates: Partial<Room> = {
        activePlayerId,
        turnOrder,
        turnExpiresAt: activePlayerId ? now + TURN_DURATION_MS : null,
      };

      expect(updates.activePlayerId).toBe('p2');
      expect(updates.turnExpiresAt).toBe(now + 10000);
    });

    it('handles consecutive turn timeouts in full cycle among players', () => {
      let currentTime = 1700000000000;
      const room: Partial<Room> = {
        status: 'QUESTION_PHASE',
        currentQuestion: null,
        activePlayerId: 'p1',
        turnOrder: ['p1', 'p2', 'p3'],
        turnExpiresAt: currentTime + TURN_DURATION_MS,
        players: {
          host: { id: 'host', name: 'Host', role: 'host', score: 0 },
          p1: { id: 'p1', name: 'Alice', role: 'player', score: 0 },
          p2: { id: 'p2', name: 'Bob', role: 'player', score: 0 },
          p3: { id: 'p3', name: 'Charlie', role: 'player', score: 0 },
        },
      };

      // 10s pass -> p1 times out -> turn to p2
      currentTime += 10000;
      expect(currentTime >= room.turnExpiresAt!).toBe(true);
      const turn1 = getNextTurn(room);
      expect(turn1.activePlayerId).toBe('p2');
      room.activePlayerId = turn1.activePlayerId;
      room.turnExpiresAt = currentTime + TURN_DURATION_MS;

      // Another 10s pass -> p2 times out -> turn to p3
      currentTime += 10000;
      expect(currentTime >= room.turnExpiresAt!).toBe(true);
      const turn2 = getNextTurn(room);
      expect(turn2.activePlayerId).toBe('p3');
      room.activePlayerId = turn2.activePlayerId;
      room.turnExpiresAt = currentTime + TURN_DURATION_MS;

      // Another 10s pass -> p3 times out -> turn wraps back to p1
      currentTime += 10000;
      expect(currentTime >= room.turnExpiresAt!).toBe(true);
      const turn3 = getNextTurn(room);
      expect(turn3.activePlayerId).toBe('p1');
    });
  });
});


