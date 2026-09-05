import { ref, onValue, set, update } from 'firebase/database';
import { getFirebaseServices, isFirebaseConfigured } from '../config/firebase';
import { Room } from '../types/game';

type RoomListener = (room: Room | null) => void;

class GameStorageService {
  private activeChannels: Map<string, BroadcastChannel> = new Map();

  // Subscribe to real-time updates of a room
  public subscribeToRoom(roomId: string, onUpdate: RoomListener): () => void {
    const { db } = getFirebaseServices();

    if (db && isFirebaseConfigured()) {
      const roomRef = ref(db, `rooms/${roomId}`);
      const unsubscribe = onValue(
        roomRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val() as Room;
            // Ensure arrays and objects exist properly
            if (!data.historyLog) data.historyLog = [];
            if (!data.submissions) data.submissions = {};
            if (!data.players) data.players = {};
            onUpdate(data);
          } else {
            onUpdate(null);
          }
        },
        (error) => {
          console.error('Firebase realtime subscription error:', error);
        }
      );

      return () => unsubscribe();
    }

    // FALLBACK: BroadcastChannel + LocalStorage for instant local multi-tab play
    const channelName = `contact_room_sync_${roomId}`;
    let channel = this.activeChannels.get(channelName);
    if (!channel) {
      channel = new BroadcastChannel(channelName);
      this.activeChannels.set(channelName, channel);
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'ROOM_UPDATE') {
        onUpdate(event.data.room as Room);
      }
    };

    channel.addEventListener('message', handleMessage);

    // Initial read from localStorage
    const saved = localStorage.getItem(`room_${roomId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Room;
        onUpdate(parsed);
      } catch (e) {
        console.error('Failed to parse local room storage', e);
        onUpdate(null);
      }
    } else {
      onUpdate(null);
    }

    // Storage event for other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `room_${roomId}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as Room;
          onUpdate(parsed);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      channel?.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }

  // Save full room data
  public async saveRoom(roomId: string, room: Room): Promise<void> {
    const { db } = getFirebaseServices();

    if (db && isFirebaseConfigured()) {
      const roomRef = ref(db, `rooms/${roomId}`);
      await set(roomRef, room);
      return;
    }

    // Fallback: LocalStorage + Broadcast
    localStorage.setItem(`room_${roomId}`, JSON.stringify(room));
    const channelName = `contact_room_sync_${roomId}`;
    const channel = this.activeChannels.get(channelName) || new BroadcastChannel(channelName);
    this.activeChannels.set(channelName, channel);
    channel.postMessage({ type: 'ROOM_UPDATE', room });
  }

  // Patch room updates
  public async updateRoom(roomId: string, updates: Partial<Room>): Promise<void> {
    const { db } = getFirebaseServices();

    if (db && isFirebaseConfigured()) {
      const roomRef = ref(db, `rooms/${roomId}`);
      await update(roomRef, {
        ...updates,
        updatedAt: Date.now()
      });
      return;
    }

    // Fallback: read existing, merge, save
    const saved = localStorage.getItem(`room_${roomId}`);
    const existing: Room = saved ? JSON.parse(saved) : ({} as Room);
    const updatedRoom: Room = {
      ...existing,
      ...updates,
      updatedAt: Date.now()
    };
    await this.saveRoom(roomId, updatedRoom);
  }
}

export const gameStorage = new GameStorageService();
