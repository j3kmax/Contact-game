export type GameStatus =
  | 'LOBBY'
  | 'QUESTION_PHASE'
  | 'CONTACT_DECLARED'
  | 'VERIFY_MATCH'
  | 'GAME_OVER';

export type PlayerRole = 'host' | 'player';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  isOnline?: boolean;
  joinedAt?: number;
}

export interface Question {
  authorId: string;
  authorName: string;
  text: string;
  createdAt?: number;
}

export interface ContactData {
  partnerId: string;
  partnerName: string;
  timerExpiresAt: number; // unix timestamp ms
}

export type HistoryItemType =
  | 'info'
  | 'question'
  | 'contact'
  | 'deflect'
  | 'match'
  | 'mismatch'
  | 'guess'
  | 'win';

export interface HistoryItem {
  id: string;
  timestamp: number;
  text: string;
  type: HistoryItemType;
  authorName?: string;
}

export interface Room {
  roomId: string;
  hostId: string;
  secretWord: string;
  revealedLettersCount: number;
  status: GameStatus;
  players: Record<string, Player>;
  currentQuestion: Question | null;
  contactData: ContactData | null;
  submissions: Record<string, string>; // playerId -> word
  historyLog: HistoryItem[];
  winner?: 'players' | 'host' | null;
  createdAt: number;
  updatedAt?: number;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}
