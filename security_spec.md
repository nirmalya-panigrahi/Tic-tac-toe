# Security Specification: Ultimate Tic·Tac·Toe Multiplayer

## 1. Data Invariants
1. Every document in `/rooms/{roomId}` must have a 12-character cryptographically random uppercase alphanumeric ID (`^[A-Z0-9]{12}$`) matching `roomCode` (60 bits of entropy via `crypto.getRandomValues`).
2. Only authenticated, email-verified users (`request.auth != null && request.auth.token.email_verified == true`) may create, read, or update rooms.
3. On room creation, `players.X.uid` must equal `request.auth.uid`, `players.O.uid` must be `null`, `status` must be `'waiting'`, `currentTurn` must be `'X'`, `winner` must be `null`, `lastMove` must be `null`, all 81 board cells and 9 `gridWins` must be `null`, and `createdAt` must equal `request.time`.
4. `roomCode`, `createdAt`, and `players.X.uid` are immutable after creation. Once `players.O.uid` is claimed on join, `players.O.uid` is also immutable.
5. Joining a room (`waiting` -> `playing`) is only allowed when `players.O.uid == null`, and sets `players.O.uid == request.auth.uid`.
6. Submitting a move is only allowed by a room participant when `status == 'playing'` and `request.auth.uid` matches `existing().currentTurn`, changing exactly ONE cell (`null` -> `currentTurn`) in a legal target sub-grid (`nextGridIndex == null` or `gridIndex == nextGridIndex` or forced grid already decided), and accurately deriving `gridWins`, `winner`, `status`, `nextGridIndex`, and `currentTurn`.
7. Presence updates (`connected` boolean) may only modify the caller's own `players.{X|O}.connected` field without altering `uid`, `name`, or board state.
8. Rematch is only allowed by a participant when `status == 'finished'`, resetting the entire board to empty `null`s, `lastMove == null`, `winner == null`, `currentTurn == 'X'`, and `status == 'playing'`.
9. List queries (`allow list`) on `/rooms` are completely disabled to prevent room enumeration.

## 2. "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated or unverified `create` / `get` / `update` on `/rooms/{roomId}`.
2. Short or malformed room ID (e.g., 6-char `GRID8X` or lowercase `abcdefghijkl`).
3. Forged board move: modifying 2 cells in a single update or altering a different sub-grid.
4. Overwriting an already occupied cell (`'X'` -> `'O'`).
5. Playing out of turn or keeping `currentTurn` unchanged after a move.
6. Playing outside the forced `nextGridIndex` while that sub-grid is still open.
7. Playing inside an already won or drawn sub-grid.
8. False winner / forged `gridWins`: claiming `winner: 'X'` or `gridWins[g] = 'X'` without 3-in-a-row.
9. Forged `nextGridIndex`: setting `nextGridIndex: null` when target sub-grid `cellIndex` is still open.
10. Pre-filled board on `create` or `rematch` (non-null cells in `grids` or `gridWins`).
11. Shadow/ghost field injection (`isAdmin: true`) or modifying immutable `createdAt`/`roomCode`.
12. Blanket `list` query on `/rooms` collection.
