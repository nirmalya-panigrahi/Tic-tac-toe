import { describe, it, expect } from 'vitest';
import { createInitialState, isValidMove, makeMove } from './gameEngine';
import { generateRoomCode, normalizeRoomState, ROOM_CODE_LENGTH } from './multiplayer';

describe('Multiplayer room codes & game engine', () => {
  it('generates 12-character uppercase room codes from the unambiguous alphabet', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      expect(code).toMatch(/^[A-Z2-9]{12}$/);
      codes.add(code);
    }
    expect(codes.size).toBe(50);
  });

  it('normalizes sparse Firestore/RTDB payloads into 9x9 grids with lastMove', () => {
    const normalized = normalizeRoomState(
      {
        roomCode: 'ABCD2345EFGH',
        status: 'playing',
        currentTurn: 'O',
        grids: { '0': { '4': 'X' } },
        gridWins: { '0': null },
        lastMove: { gridIndex: 0, cellIndex: 4 },
      },
      'ABCD2345EFGH'
    );

    expect(normalized.grids).toHaveLength(9);
    expect(normalized.grids[0]).toHaveLength(9);
    expect(normalized.grids[0][4]).toBe('X');
    expect(normalized.grids[1][0]).toBeNull();
    expect(normalized.lastMove).toEqual({ gridIndex: 0, cellIndex: 4 });
  });

  it('enforces forced nextGridIndex and opens free play when target grid is won', () => {
    let state = createInitialState();
    state = makeMove(state, { gridIndex: 0, cellIndex: 4 });
    expect(state.nextGridIndex).toBe(4);
    expect(isValidMove(state, { gridIndex: 1, cellIndex: 0 })).toBe(false);
    expect(isValidMove(state, { gridIndex: 4, cellIndex: 0 })).toBe(true);
  });
});
