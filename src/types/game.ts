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
  intendedWord?: string; // Secret word intended by the author
  createdAt?: number;
}

export interface DeflectAttempt {
  word: string;
  timestamp: number;
}

export interface ContactPartner {
  id: string;
  name: string;
}

export interface ContactData {
  partnerId: string;
  partnerName: string;
  additionalPartners?: ContactPartner[];
  timerExpiresAt: number; // unix timestamp ms
}

export type HistoryItemType =
  | 'info'
  | 'question'
  | 'contact'
  | 'deflect'
  | 'deflect_fail'
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
  lastDeflectAttempt?: DeflectAttempt | null;
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
