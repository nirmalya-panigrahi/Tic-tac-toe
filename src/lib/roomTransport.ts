import {
  firestore,
  OperationType,
  handleFirestoreError,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  firestoreServerTimestamp,
} from '../firebase';
import { CellValue, Move, Player, RoomPlayer, RoomState, RoomStatus, RoomWinner } from '../types';
import { normalizeRoomState } from './multiplayer';

/**
 * Firestore does not allow nested arrays (CellValue[][]).
 * Converting grids to a 9-key map { "0": [...], ..., "8": [...] }.
 */
function serializeGrids(grids: CellValue[][]): Record<string, CellValue[]> {
  const mapped: Record<string, CellValue[]> = {};
  for (let i = 0; i < 9; i++) {
    mapped[String(i)] = grids[i] ?? Array(9).fill(null);
  }
  return mapped;
}

export async function fetchRoom(roomCode: string): Promise<RoomState | null> {
  if (!firestore) {
    throw new Error('Firebase Firestore is not configured.');
  }

  const path = `rooms/${roomCode}`;
  try {
    const snap = await getDoc(doc(firestore, 'rooms', roomCode));
    if (!snap.exists()) return null;
    return normalizeRoomState(snap.data() as Record<string, unknown>, roomCode);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export interface CreateRoomInput {
  roomCode: string;
  grids: CellValue[][];
  gridWins: RoomWinner[];
  hostUid: string | null;
  hostName: string;
  logs: string[];
}

export async function createRoomInDb(input: CreateRoomInput): Promise<void> {
  if (!firestore) {
    throw new Error('Firebase Firestore is not configured.');
  }

  const payload = {
    roomCode: input.roomCode,
    status: 'waiting' as RoomStatus,
    createdAt: firestoreServerTimestamp(),
    currentTurn: 'X' as Player,
    nextGridIndex: null,
    grids: serializeGrids(input.grids),
    gridWins: input.gridWins,
    winner: null,
    lastMove: null,
    players: {
      X: {
        uid: input.hostUid ?? '',
        name: input.hostName,
        connected: true,
      },
      O: {
        uid: null,
        name: '',
        connected: false,
      },
    },
    logs: input.logs,
  };

  const path = `rooms/${input.roomCode}`;
  try {
    await setDoc(doc(firestore, 'rooms', input.roomCode), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function joinRoomInDb(
  roomCode: string,
  playerO: RoomPlayer,
  logs: string[]
): Promise<void> {
  if (!firestore) {
    throw new Error('Firebase Firestore is not configured.');
  }

  const path = `rooms/${roomCode}`;
  try {
    await updateDoc(doc(firestore, 'rooms', roomCode), {
      'players.O': {
        uid: playerO.uid ?? null,
        name: playerO.name,
        connected: playerO.connected,
      },
      status: 'playing',
      logs,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export interface RoomUpdatePayload {
  currentTurn?: Player;
  nextGridIndex?: number | null;
  grids?: CellValue[][];
  gridWins?: RoomWinner[];
  winner?: RoomWinner;
  lastMove?: Move | null;
  status?: RoomStatus;
  logs?: string[];
}

export async function updateRoomInDb(
  roomCode: string,
  patch: RoomUpdatePayload
): Promise<void> {
  if (!firestore) {
    throw new Error('Firebase Firestore is not configured.');
  }

  const serialized: Record<string, unknown> = { ...patch };
  if (patch.grids) {
    serialized.grids = serializeGrids(patch.grids);
  }

  const path = `rooms/${roomCode}`;
  try {
    await updateDoc(doc(firestore, 'rooms', roomCode), serialized);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function disconnectPlayerInDb(
  roomCode: string,
  role: Player
): Promise<void> {
  if (!firestore) return;

  const path = `rooms/${roomCode}`;
  try {
    await updateDoc(doc(firestore, 'rooms', roomCode), {
      [`players.${role}.connected`]: false,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToRoomWithPresence(
  roomCode: string,
  role: Player,
  onRoomUpdate: (room: RoomState) => void,
  onRoomMissing: () => void,
  onError: (message: string) => void
): () => void {
  if (!firestore) {
    return () => {};
  }

  const path = `rooms/${roomCode}`;
  const roomDocRef = doc(firestore, 'rooms', roomCode);

  updateDoc(roomDocRef, { [`players.${role}.connected`]: true }).catch(() => {
    // Non-fatal if room already closed
  });

  const unsubSnapshot = onSnapshot(
    roomDocRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onRoomMissing();
        return;
      }
      onRoomUpdate(normalizeRoomState(snapshot.data() as Record<string, unknown>, roomCode));
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped instanceof Error ? wrapped.message : 'Failed to sync room state.');
      }
    }
  );

  const handleUnload = () => {
    updateDoc(roomDocRef, { [`players.${role}.connected`]: false }).catch(() => {});
  };

  window.addEventListener('pagehide', handleUnload);
  window.addEventListener('beforeunload', handleUnload);

  return () => {
    unsubSnapshot();
    window.removeEventListener('pagehide', handleUnload);
    window.removeEventListener('beforeunload', handleUnload);
  };
}
