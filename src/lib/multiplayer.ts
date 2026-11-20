import { BoardState, CellValue, GridWinner, Move, Player, RoomState, RoomWinner } from '../types';

const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length = 6): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

export function getGridName(idx: number): string {
  const rows = ['Top', 'Middle', 'Bottom'];
  const cols = ['Left', 'Center', 'Right'];
  return `${rows[Math.floor(idx / 3)]} ${cols[idx % 3]}`;
}

export function normalizeCellValue(val: unknown): CellValue {
  return val === 'X' || val === 'O' ? val : null;
}

export function normalizeRoomWinner(val: unknown): RoomWinner {
  if (val === 'X' || val === 'O') return val;
  if (val === 'DRAW' || val === 'Draw') return 'DRAW';
  return null;
}

export function toBoardGridWinner(val: RoomWinner): GridWinner {
  if (val === 'DRAW') return 'Draw';
  return val;
}

export function toRoomWinner(val: GridWinner): RoomWinner {
  if (val === 'Draw') return 'DRAW';
  return val;
}

/**
 * Firebase Realtime Database strips `null` values and converts sparse arrays into objects.
 * This normalizer guarantees deterministic 9x9 grids, 9 gridWins, and explicit nulls.
 */
export function normalizeRoomState(raw: Record<string, unknown> | null | undefined, fallbackCode: string): RoomState {
  const rawGrids = (raw?.grids ?? {}) as Record<string, Record<string, unknown> | unknown[]>;
  const grids: CellValue[][] = Array.from({ length: 9 }, (_, gIdx) => {
    const rawGrid = rawGrids?.[gIdx] ?? {};
    return Array.from({ length: 9 }, (_, cIdx) => {
      const cell = (rawGrid as Record<number, unknown>)?.[cIdx];
      return normalizeCellValue(cell);
    });
  });

  const rawGridWins = (raw?.gridWins ?? {}) as Record<string, unknown>;
  const gridWins: RoomWinner[] = Array.from({ length: 9 }, (_, gIdx) =>
    normalizeRoomWinner(rawGridWins?.[gIdx])
  );

  const rawNext = raw?.nextGridIndex;
  const nextGridIndex =
    typeof rawNext === 'number' && rawNext >= 0 && rawNext <= 8 ? rawNext : null;

  const rawPlayers = (raw?.players ?? {}) as Record<string, Record<string, unknown>>;
  const playerX = rawPlayers?.X ?? {};
  const playerO = rawPlayers?.O ?? {};

  const winner = normalizeRoomWinner(raw?.winner);
  const rawStatus = raw?.status;
  const status =
    rawStatus === 'waiting' || rawStatus === 'playing' || rawStatus === 'finished'
      ? rawStatus
      : winner
        ? 'finished'
        : 'waiting';

  const rawLogs = raw?.logs;
  const logs: string[] = Array.isArray(rawLogs)
    ? rawLogs.filter((entry): entry is string => typeof entry === 'string')
    : rawLogs && typeof rawLogs === 'object'
      ? Object.values(rawLogs).filter((entry): entry is string => typeof entry === 'string')
      : [];

  return {
    roomCode: typeof raw?.roomCode === 'string' ? raw.roomCode : fallbackCode,
    status,
    createdAt: (raw?.createdAt as number | object | null) ?? null,
    currentTurn: raw?.currentTurn === 'O' ? 'O' : 'X',
    nextGridIndex,
    grids,
    gridWins,
    winner,
    players: {
      X: {
        uid: typeof playerX.uid === 'string' ? playerX.uid : null,
        name: typeof playerX.name === 'string' && playerX.name.trim() ? playerX.name : 'AGENT X',
        connected: Boolean(playerX.connected),
      },
      O: {
        uid: typeof playerO.uid === 'string' ? playerO.uid : null,
        name: typeof playerO.name === 'string' ? playerO.name : '',
        connected: Boolean(playerO.connected),
      },
    },
    logs,
  };
}

export function roomToBoardState(room: RoomState): BoardState {
  return {
    grids: room.grids.map((g) => [...g]),
    gridWins: room.gridWins.map(toBoardGridWinner),
    nextGridIndex: room.nextGridIndex,
    currentPlayer: room.currentTurn,
    winner: toBoardGridWinner(room.winner),
  };
}

export function buildMoveLogEntries(
  player: Player,
  playerLabel: string,
  move: Move,
  nextState: BoardState
): string[] {
  const entries: string[] = [];

  if (nextState.winner) {
    if (nextState.winner === 'Draw') {
      entries.push('Conflict Terminated: Tactical Draw.');
    } else {
      entries.push(`Victory Sequence: ${playerLabel} [${nextState.winner}] wins the overall board!`);
    }
  }

  if (nextState.gridWins[move.gridIndex] === player) {
    entries.push(`Sector Secured: ${playerLabel} [${player}] won the ${getGridName(move.gridIndex)} grid!`);
  } else if (nextState.gridWins[move.gridIndex] === 'Draw') {
    entries.push(`Sector Neutralized: ${getGridName(move.gridIndex)} grid ended in a draw.`);
  }

  if (nextState.nextGridIndex === null && !nextState.winner) {
    entries.push('Board open: Play in any available grid.');
  }

  entries.push(`${playerLabel} [${player}] played in ${getGridName(move.gridIndex)} grid, ${getGridName(move.cellIndex)} spot.`);

  return entries;
}
