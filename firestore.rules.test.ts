import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';

const ROOM_ID = 'ABCD2345EFGH';

function emptyGrids(): Record<string, (string | null)[]> {
  const grids: Record<string, (string | null)[]> = {};
  for (let i = 0; i < 9; i++) {
    grids[String(i)] = Array(9).fill(null);
  }
  return grids;
}

function baseRoomPayload(uidX: string) {
  return {
    roomCode: ROOM_ID,
    status: 'waiting',
    createdAt: serverTimestamp(),
    currentTurn: 'X',
    nextGridIndex: null,
    grids: emptyGrids(),
    gridWins: Array(9).fill(null),
    winner: null,
    lastMove: null,
    players: {
      X: { uid: uidX, name: 'AGENT_X', connected: true },
      O: { uid: null, name: '', connected: false },
    },
    logs: ['Room initialized.'],
  };
}

describe('Firestore Security Rules — Ultimate Tic-Tac-Toe', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'trans-girder-w91ww',
      firestore: {
        rules: readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('rejects unauthenticated and unverified users', async () => {
    const unauthDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(unauthDb, 'rooms', ROOM_ID), baseRoomPayload('anon')));

    const unverifiedDb = testEnv
      .authenticatedContext('userX', { email: 'x@example.com', email_verified: false })
      .firestore();
    await assertFails(setDoc(doc(unverifiedDb, 'rooms', ROOM_ID), baseRoomPayload('userX')));
  });

  it('rejects short 6-char room IDs and blanket collection list queries', async () => {
    const dbX = testEnv
      .authenticatedContext('userX', { email: 'x@example.com', email_verified: true })
      .firestore();

    await assertFails(
      setDoc(doc(dbX, 'rooms', 'GRID8X'), { ...baseRoomPayload('userX'), roomCode: 'GRID8X' })
    );
    await assertFails(getDocs(collection(dbX, 'rooms')));
  });

  it('rejects pre-filled forged board on room creation', async () => {
    const dbX = testEnv
      .authenticatedContext('userX', { email: 'x@example.com', email_verified: true })
      .firestore();

    const forged = baseRoomPayload('userX');
    forged.grids['0'][0] = 'X';
    await assertFails(setDoc(doc(dbX, 'rooms', ROOM_ID), forged));
  });

  it('allows valid create, join, legal single-cell move, and rejects forged moves/false winners', async () => {
    const dbX = testEnv
      .authenticatedContext('userX', { email: 'x@example.com', email_verified: true })
      .firestore();
    const dbO = testEnv
      .authenticatedContext('userO', { email: 'o@example.com', email_verified: true })
      .firestore();
    const dbIntruder = testEnv
      .authenticatedContext('intruder', { email: 'z@example.com', email_verified: true })
      .firestore();

    // 1. Valid create by X
    await assertSucceeds(setDoc(doc(dbX, 'rooms', ROOM_ID), baseRoomPayload('userX')));

    // 2. Valid join by O
    await assertSucceeds(
      updateDoc(doc(dbO, 'rooms', ROOM_ID), {
        'players.O': { uid: 'userO', name: 'AGENT_O', connected: true },
        status: 'playing',
        logs: ['O joined'],
      })
    );

    // 3. Reject intruder move
    const move1Grids = emptyGrids();
    move1Grids['0'][4] = 'X';
    await assertFails(
      updateDoc(doc(dbIntruder, 'rooms', ROOM_ID), {
        currentTurn: 'O',
        nextGridIndex: 4,
        grids: move1Grids,
        gridWins: Array(9).fill(null),
        winner: null,
        lastMove: { gridIndex: 0, cellIndex: 4 },
        status: 'playing',
        logs: ['Intruder move'],
      })
    );

    // 4. Reject forged multi-cell move (2 cells changed at once)
    const twoCellGrids = emptyGrids();
    twoCellGrids['0'][4] = 'X';
    twoCellGrids['0'][1] = 'X';
    await assertFails(
      updateDoc(doc(dbX, 'rooms', ROOM_ID), {
        currentTurn: 'O',
        nextGridIndex: 4,
        grids: twoCellGrids,
        gridWins: Array(9).fill(null),
        winner: null,
        lastMove: { gridIndex: 0, cellIndex: 4 },
        status: 'playing',
        logs: ['Forged 2 cells'],
      })
    );

    // 5. Reject false winner claim
    await assertFails(
      updateDoc(doc(dbX, 'rooms', ROOM_ID), {
        currentTurn: 'O',
        nextGridIndex: 4,
        grids: move1Grids,
        gridWins: Array(9).fill(null),
        winner: 'X',
        lastMove: { gridIndex: 0, cellIndex: 4 },
        status: 'finished',
        logs: ['False win'],
      })
    );

    // 6. Reject wrong nextGridIndex
    await assertFails(
      updateDoc(doc(dbX, 'rooms', ROOM_ID), {
        currentTurn: 'O',
        nextGridIndex: null,
        grids: move1Grids,
        gridWins: Array(9).fill(null),
        winner: null,
        lastMove: { gridIndex: 0, cellIndex: 4 },
        status: 'playing',
        logs: ['Forged free play'],
      })
    );

    // 7. Valid move by X in (0, 4) -> forces nextGridIndex = 4
    await assertSucceeds(
      updateDoc(doc(dbX, 'rooms', ROOM_ID), {
        currentTurn: 'O',
        nextGridIndex: 4,
        grids: move1Grids,
        gridWins: Array(9).fill(null),
        winner: null,
        lastMove: { gridIndex: 0, cellIndex: 4 },
        status: 'playing',
        logs: ['X played (0,4)'],
      })
    );

    // 8. Reject X playing out of turn
    const outOfTurnGrids = emptyGrids();
    outOfTurnGrids['0'][4] = 'X';
    outOfTurnGrids['4'][0] = 'X';
    await assertFails(
      updateDoc(doc(dbX, 'rooms', ROOM_ID), {
        currentTurn: 'O',
        nextGridIndex: 0,
        grids: outOfTurnGrids,
        gridWins: Array(9).fill(null),
        winner: null,
        lastMove: { gridIndex: 4, cellIndex: 0 },
        status: 'playing',
        logs: ['Out of turn'],
      })
    );

    // 9. Reject O playing in illegal sub-grid (must play in grid 4)
    const wrongSubGrid = emptyGrids();
    wrongSubGrid['0'][4] = 'X';
    wrongSubGrid['1'][0] = 'O';
    await assertFails(
      updateDoc(doc(dbO, 'rooms', ROOM_ID), {
        currentTurn: 'X',
        nextGridIndex: 0,
        grids: wrongSubGrid,
        gridWins: Array(9).fill(null),
        winner: null,
        lastMove: { gridIndex: 1, cellIndex: 0 },
        status: 'playing',
        logs: ['Wrong subgrid'],
      })
    );

    // 10. Verify room read works for verified user
    await assertSucceeds(getDoc(doc(dbO, 'rooms', ROOM_ID)));
  });
});
