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
});
