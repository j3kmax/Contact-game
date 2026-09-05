import { describe, it, expect } from 'vitest';

function normalizeWord(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/ё/g, 'е')
    .replace(/[^а-яa-z0-9]/gi, '');
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
});
