# Security Specification: Ultimate Tic·Tac·Toe Multiplayer

## 1. Data Invariants
1. Every document in `/rooms/{roomId}` must have a 6-character uppercase alphanumeric ID (`^[A-Z0-9]{6}$`) matching `roomCode`.
2. Only authenticated, email-verified users (`request.auth != null && request.auth.token.email_verified == true`) may create, read, or update rooms.
3. On room creation, `players.X.uid` must equal `request.auth.uid`, `players.O.uid` must be `null`, `status` must be `'waiting'`, `currentTurn` must be `'X'`, `winner` must be `null`, and `createdAt` must equal `request.time`.
4. `roomCode`, `createdAt`, and `players.X.uid` are immutable after creation. Once `players.O.uid` is claimed on join, `players.O.uid` is also immutable.
5. Joining a room (`waiting` -> `playing`) is only allowed when `players.O.uid == null`, and sets `players.O.uid == request.auth.uid`.
6. Submitting a move is only allowed by a room participant (`request.auth.uid == players.X.uid` or `players.O.uid`) when `status == 'playing'` AND `request.auth.uid` matches the player for `existing().currentTurn`, toggling `currentTurn` to the opposite player.
7. Presence updates (`connected` boolean) may only modify the caller's own `players.{X|O}.connected` field without altering `uid`, `name`, or board state.
8. List queries (`allow list`) on `/rooms` are completely disabled to prevent room enumeration.

## 2. "Dirty Dozen" Attack Payloads (Expected: PERMISSION_DENIED)
1. Unauthenticated `create` on `/rooms/GRID8X`.
2. Unverified email (`email_verified: false`) `create` on `/rooms/GRID8X`.
3. Invalid `roomId` length or lowercase (`rooms/grid8x` or `rooms/TOO_LONG_ID`).
4. Identity spoofing on `create`: `players.X.uid != request.auth.uid`.
5. Pre-filled `players.O.uid` or `status: 'playing'` on `create`.
6. Spoofed `createdAt` timestamp (`createdAt != request.time`) on `create`.
7. Shadow/ghost field injection (`isAdmin: true` or `extraField: 123`) on `create` or `update`.
8. Non-participant attempting a move update on an active `playing` room.
9. Turn-stealing: Player X attempting to submit a move when `existing().currentTurn == 'O'`.
10. Modifying `createdAt` or `roomCode` during an update.
11. Value poisoning: setting `winner` to a 1MB string or `nextGridIndex` to `99`.
12. Blanket `list` query on `/rooms` collection.
