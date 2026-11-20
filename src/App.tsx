/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  RefreshCw,
  MessageSquare,
  Info,
  Play,
  Lightbulb,
  X as CloseIcon,
  Undo2,
  Sun,
  Moon,
  Skull,
  Copy,
  Check,
  Users,
  Cpu,
  Wifi,
  WifiOff,
  LogOut,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  Player,
  BoardState,
  Move,
  Difficulty,
  GameHistoryEntry,
  GameMode,
  RoomState,
} from './types';
import { createInitialState, makeMove, isValidMove } from './lib/gameEngine';
import { getBestMove, evaluateHeuristic } from './lib/aiEngine';
import {
  app,
  auth,
  googleProvider,
  isFirebaseConfigured,
  missingFirebaseEnvVars,
  firebaseInitError,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from './firebase';
import {
  ROOM_CODE_LENGTH,
  generateRoomCode,
  getGridName,
  roomToBoardState,
  toRoomWinner,
  buildMoveLogEntries,
} from './lib/multiplayer';
import {
  fetchRoom,
  createRoomInDb,
  joinRoomInDb,
  updateRoomInDb,
  disconnectPlayerInDb,
  subscribeToRoomWithPresence,
} from './lib/roomTransport';

// --- Sub-components ---

const TechBackground = React.memo(({ isDark }: { isDark: boolean }) => {
  const circuitLines = useMemo(
    () =>
      Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        width: i % 2 === 0 ? '1px' : `${Math.random() * 200 + 100}px`,
        height: i % 2 === 0 ? `${Math.random() * 200 + 100}px` : '1px',
        duration: `${Math.random() * 5 + 3}s`,
        delay: `${Math.random() * 5}s`,
        color:
          i % 3 === 0
            ? isDark
              ? 'rgba(34, 211, 238, 0.2)'
              : 'rgba(34, 211, 238, 0.4)'
            : isDark
              ? 'rgba(244, 114, 182, 0.2)'
              : 'rgba(244, 114, 182, 0.4)',
      })),
    [isDark]
  );

  return (
    <div
      className={`fixed inset-0 z-[-2] overflow-hidden pointer-events-none transition-colors duration-700 ${
        isDark ? 'bg-[#050505]' : 'bg-slate-50'
      }`}
    >
      {/* Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `radial-gradient(${
            isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
          } 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
        }}
      />

      {/* Circuit lines */}
      {circuitLines.map((line) => (
        <motion.div
          key={line.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            repeat: Infinity,
            duration: parseFloat(line.duration),
            delay: parseFloat(line.delay),
            ease: 'easeInOut',
          }}
          className="absolute"
          style={{
            left: line.left,
            top: line.top,
            width: line.width,
            height: line.height,
            backgroundColor: line.color,
            boxShadow: `0 0 10px ${line.color}`,
          }}
        />
      ))}

      {/* Blurred Orbs */}
      <div
        className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] transition-opacity duration-1000 ${
          isDark ? 'bg-cyan-500/10 opacity-60' : 'bg-cyan-500/5 opacity-40'
        }`}
      />
      <div
        className={`absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full blur-[120px] transition-opacity duration-1000 ${
          isDark ? 'bg-pink-500/10 opacity-60' : 'bg-pink-500/5 opacity-40'
        }`}
      />

      {/* Overall Blur for content visibility */}
      <div className="absolute inset-0 backdrop-blur-[1px]" />
    </div>
  );
});

const MultilingualUltimate = React.memo(({ isDark }: { isDark: boolean }) => {
  const languages = useMemo(
    () => [
      'ULTIMATE', // English
      'ПРЕДЕЛЬНЫЙ', // Russian
      '极致', // Chinese
      'ULTIME', // French
      '궁극', // Korean
      'ÚLTIMO', // Spanish
      '究極', // Japanese
      'ULTIMATIV', // German
      'परम', // Hindi
      'ପରମ', // Odia
    ],
    []
  );

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % languages.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [languages.length]);

  return (
    <span className="relative inline-block min-w-[2ch] text-center">
      <AnimatePresence mode="wait">
        <motion.span
          key={languages[index]}
          initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className={`electric-glow blackout-effect relative inline-block ${
            !isDark ? 'drop-shadow-[0_0_8px_rgba(8,145,178,0.45)]' : ''
          }`}
        >
          {languages[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
});

interface CellProps {
  value: Player | null;
  onClick: () => void;
  isValid: boolean;
  isHint?: boolean;
  isDark: boolean;
}

const Cell: React.FC<CellProps> = ({ value, onClick, isValid, isHint, isDark }) => {
  return (
    <motion.div
      whileHover={
        isValid
          ? {
              backgroundColor: isDark
                ? 'rgba(34, 211, 238, 0.15)'
                : 'rgba(34, 211, 238, 0.1)',
            }
          : {}
      }
      whileTap={isValid ? { scale: 0.95 } : {}}
      onClick={onClick}
      className={`
        relative h-full w-full flex items-center justify-center rounded-sm transition-all
        bg-zinc-500/10 border border-transparent
        ${isValid ? 'cursor-pointer hover:border-cyan-500/30' : 'cursor-not-allowed'}
        ${!isValid && !value ? 'opacity-30' : 'opacity-100'}
        ${isValid && !isDark ? 'bg-zinc-400/20 border-slate-200' : ''}
        ${isHint ? 'ring-2 ring-yellow-400/50 bg-yellow-400/10' : ''}
      `}
    >
      <AnimatePresence mode="wait">
        {value === 'X' && (
          <motion.span
            initial={{ scale: 0, opacity: 0, rotate: -45 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            className="text-lg font-bold neon-cyan"
          >
            X
          </motion.span>
        )}
        {value === 'O' && (
          <motion.span
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-lg font-bold neon-pink"
          >
            O
          </motion.span>
        )}
        {isHint && !value && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <Lightbulb size={12} className="text-yellow-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

interface GridProps {
  board: (Player | null)[];
  onMove: (cellIndex: number) => void;
  isNextGrid: boolean;
  winner: Player | 'Draw' | null;
  dimmed: boolean;
  canInteract: boolean;
  hintIndex?: number | null;
  isDark: boolean;
}

const SmallGrid: React.FC<GridProps> = ({
  board,
  onMove,
  isNextGrid,
  winner,
  dimmed,
  canInteract,
  hintIndex,
  isDark,
}) => {
  return (
    <div
      className={`
      relative grid grid-cols-3 grid-rows-3 gap-1 p-1 transition-all duration-300 rounded-[12px]
      ${
        isNextGrid
          ? isDark
            ? 'glass border-active animate-pulse-cyan ring-1 ring-cyan-500/30'
            : 'bg-cyan-50 border-2 border-cyan-400 animate-pulse-cyan shadow-lg'
          : isDark
            ? 'glass border-white/10'
            : 'bg-slate-200/50 border border-slate-300'
      }
      ${dimmed ? 'grid-dimmed' : ''}
    `}
    >
      {board.map((cell, idx) => (
        <Cell
          key={idx}
          value={cell}
          onClick={() => onMove(idx)}
          isValid={canInteract && !winner && (isNextGrid || dimmed === false) && cell === null}
          isHint={hintIndex === idx}
          isDark={isDark}
        />
      ))}

      <AnimatePresence>
        {winner && winner !== 'Draw' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${
              isDark ? 'winning-overlay' : 'winning-overlay-light'
            } absolute inset-0 text-5xl z-10 ${winner === 'X' ? 'neon-cyan' : 'neon-pink'}`}
          >
            {winner}
          </motion.div>
        )}
        {winner === 'Draw' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`${
              isDark ? 'winning-overlay' : 'winning-overlay-light'
            } absolute inset-0 text-2xl text-zinc-500 z-10`}
          >
            DRAW
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  // Solo State
  const [gameState, setGameState] = useState<BoardState>(createInitialState());
  const [difficulty, setDifficulty] = useState<Difficulty>('Tactician');
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [commentary, setCommentary] = useState<string[]>([
    'Welcome Commander. Make your first move.',
  ]);
  const [stats, setStats] = useState({ X: 0, O: 0 });
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Mode, Navigation & Theme State
  const [gameMode, setGameMode] = useState<GameMode>('solo');
  const [showHome, setShowHome] = useState(true);
  const [playerName, setPlayerName] = useState('PILOT');
  const [showLog, setShowLog] = useState(false);
  const [hint, setHint] = useState<Move | null>(null);
  const [isDark, setIsDark] = useState(true);

  // Online Multiplayer & Auth State
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(!auth);
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [localRole, setLocalRole] = useState<Player | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [multiplayerError, setMultiplayerError] = useState<string | null>(null);
  const [isRoomBusy, setIsRoomBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [mpStats, setMpStats] = useState({ X: 0, O: 0 });

  const prevRoomWinnerRef = useRef<RoomState['winner']>(null);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
      if (user?.displayName) {
        setPlayerName((prev) =>
          prev === 'PILOT'
            ? user.displayName!.split(' ')[0].toUpperCase().replace(/[^A-Z0-9_]/g, '').slice(0, 15) || 'PILOT'
            : prev
        );
      }
    });
    return () => unsub();
  }, []);

  const extractReadableError = (err: unknown, fallback: string): string => {
    if (!(err instanceof Error)) return fallback;
    try {
      const parsed = JSON.parse(err.message) as { error?: string };
      if (parsed && typeof parsed.error === 'string') return parsed.error;
    } catch {
      // Not JSON-wrapped
    }
    return err.message || fallback;
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setMultiplayerError(null);
    setIsAuthBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/unauthorized-domain') {
        const host =
          typeof window !== 'undefined' ? window.location.hostname : 'this domain';
        const projectId = app?.options.projectId || 'your Firebase project';
        setMultiplayerError(
          `Domain "${host}" is not authorized for Google sign-in in Firebase project "${projectId}". Add "${host}" in Firebase Console → Authentication → Settings → Authorized domains.`
        );
      } else if (code === 'auth/popup-blocked') {
        setMultiplayerError(
          'Sign-in popup was blocked by your browser. Allow popups for this site and try again.'
        );
      } else if (code === 'auth/popup-closed-by-user') {
        setMultiplayerError('Sign-in popup was closed before completing authentication.');
      } else {
        setMultiplayerError(extractReadableError(err, 'Google sign-in failed.'));
      }
    } finally {
      setIsAuthBusy(false);
    }
  };

  const handleGoogleSignOut = async () => {
    if (!auth) return;
    try {
      if (activeRoomCode && localRole) {
        await disconnectPlayerInDb(activeRoomCode, localRole).catch(() => {});
      }
      await signOut(auth);
      setActiveRoomCode(null);
      setLocalRole(null);
      setRoomState(null);
      setMultiplayerError(null);
    } catch (err) {
      setMultiplayerError(extractReadableError(err, 'Sign out failed.'));
    }
  };

  const addCommentary = useCallback((msg: string) => {
    setCommentary((prev) => [msg, ...prev].slice(0, 8));
  }, []);

  // --- Solo Move Execution ---
  const handleSoloMove = useCallback(
    (gridIndex: number, cellIndex: number) => {
      if (!isValidMove(gameState, { gridIndex, cellIndex })) {
        return;
      }

      setHint(null);
      const currentPlayer = gameState.currentPlayer;

      let analysis: string | undefined;
      if (currentPlayer === 'X') {
        const best = getBestMove(gameState, 'Grandmaster');
        if (best.gridIndex === gridIndex && best.cellIndex === cellIndex) {
          analysis = "OPTIMAL: You matched the Engine's best recommendation.";
        } else {
          analysis = `SUB-OPTIMAL: Engine preferred ${getGridName(best.gridIndex)} board at ${getGridName(best.cellIndex)}.`;
        }
      }

      const nextState = makeMove(gameState, { gridIndex, cellIndex });
      setGameState(nextState);
      setHistory((prev) => [
        { move: { gridIndex, cellIndex }, player: currentPlayer, timestamp: Date.now(), analysis },
        ...prev,
      ]);

      const moveDesc = `${currentPlayer} played in ${getGridName(gridIndex)} grid, ${getGridName(cellIndex)} spot.`;
      addCommentary(analysis ? `${moveDesc} ${analysis}` : moveDesc);

      if (nextState.nextGridIndex === null && !nextState.winner) {
        addCommentary('Board open: Play in any available grid.');
      } else if (nextState.gridWins[gridIndex] === currentPlayer) {
        addCommentary(`Sector Secured: ${currentPlayer} won the ${getGridName(gridIndex)} grid!`);
      }

      if (nextState.winner) {
        if (nextState.winner === 'Draw') {
          addCommentary('Conflict Terminated: Tactical Draw.');
        } else {
          addCommentary(`Victory Sequence: ${nextState.winner} wins the overall board!`);
          setStats((s) => ({ ...s, [nextState.winner as Player]: s[nextState.winner as Player] + 1 }));

          if (nextState.winner === 'X') {
            confetti({
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#22d3ee', '#f472b6', '#ffffff'],
            });
          }
        }
      }
    },
    [gameState, addCommentary]
  );

  // Solo AI Turn Effect
  useEffect(() => {
    if (
      gameMode === 'solo' &&
      !showHome &&
      gameState.currentPlayer === 'O' &&
      !gameState.winner
    ) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        const move = getBestMove(gameState, difficulty);
        handleSoloMove(move.gridIndex, move.cellIndex);
        setIsAiThinking(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameMode, gameState, difficulty, handleSoloMove, showHome]);

  // --- Multiplayer Subscription & Presence ---
  useEffect(() => {
    if (!isFirebaseConfigured || !activeRoomCode || !localRole) {
      return;
    }
    if (!authReady || !authUser) {
      return;
    }

    return subscribeToRoomWithPresence(
      activeRoomCode,
      localRole,
      (normalized) => {
        setRoomState(normalized);
      },
      () => {
        setMultiplayerError('Room session was closed or no longer exists.');
        setRoomState(null);
      },
      (msg) => {
        setMultiplayerError(msg);
      }
    );
  }, [activeRoomCode, localRole, authReady, authUser]);

  // Trigger confetti & score tracking on multiplayer match completion
  useEffect(() => {
    if (gameMode !== 'multiplayer' || !roomState) {
      prevRoomWinnerRef.current = null;
      return;
    }

    const prevWinner = prevRoomWinnerRef.current;
    const currentWinner = roomState.winner;

    if (!prevWinner && currentWinner) {
      if (currentWinner === localRole) {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#22d3ee', '#f472b6', '#ffffff'],
        });
      }
      if (currentWinner === 'X' || currentWinner === 'O') {
        setMpStats((prev) => ({ ...prev, [currentWinner]: prev[currentWinner] + 1 }));
      }
    }

    prevRoomWinnerRef.current = currentWinner;
  }, [gameMode, roomState, localRole]);

  // --- Multiplayer Actions ---
  const cleanAgentName = useMemo(() => {
    const trimmed = playerName.trim().toUpperCase().slice(0, 15);
    return trimmed || 'PILOT';
  }, [playerName]);

  const requiresAuth = true;
  const canUseMultiplayer = isFirebaseConfigured && Boolean(authUser);

  const handleCreateRoom = async () => {
    if (!isFirebaseConfigured) {
      setMultiplayerError('Firebase configuration is missing.');
      return;
    }
    if (!authUser) {
      setMultiplayerError('Please sign in with Google to create a room.');
      return;
    }

    setMultiplayerError(null);
    setIsRoomBusy(true);

    try {
      let code = generateRoomCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        const existing = await fetchRoom(code);
        if (!existing) break;
        code = generateRoomCode();
      }

      const initialBoard = createInitialState();
      await createRoomInDb({
        roomCode: code,
        grids: initialBoard.grids,
        gridWins: initialBoard.gridWins.map(toRoomWinner),
        hostUid: authUser?.uid ?? null,
        hostName: cleanAgentName,
        logs: [`Room ${code} initialized by ${cleanAgentName} [X]. Waiting for Opponent [O]...`],
      });

      setMpStats({ X: 0, O: 0 });
      prevRoomWinnerRef.current = null;
      setLocalRole('X');
      setActiveRoomCode(code);
      setGameMode('multiplayer');
      setShowHome(false);
      setHint(null);
    } catch (err) {
      setMultiplayerError(
        extractReadableError(err, 'Unable to create room. Check Firebase security rules.')
      );
    } finally {
      setIsRoomBusy(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!isFirebaseConfigured) {
      setMultiplayerError('Firebase configuration is missing.');
      return;
    }
    if (requiresAuth && !authUser) {
      setMultiplayerError('Please sign in with Google to join a room.');
      return;
    }

    const code = joinCodeInput.trim().toUpperCase();
    if (code.length !== ROOM_CODE_LENGTH) {
      setMultiplayerError(`Enter a valid ${ROOM_CODE_LENGTH}-character room code.`);
      return;
    }

    setMultiplayerError(null);
    setIsRoomBusy(true);

    try {
      const existingRoom = await fetchRoom(code);

      if (!existingRoom) {
        setMultiplayerError(`Room "${code}" was not found. Verify the ${ROOM_CODE_LENGTH}-character code.`);
        return;
      }

      // Allow re-joining if the signed-in user is already one of the room participants
      const isAlreadyX = Boolean(authUser?.uid && existingRoom.players.X.uid === authUser.uid);
      const isAlreadyO = Boolean(authUser?.uid && existingRoom.players.O.uid === authUser.uid);

      if (isAlreadyX || isAlreadyO) {
        const role: Player = isAlreadyX ? 'X' : 'O';
        setMpStats({ X: 0, O: 0 });
        prevRoomWinnerRef.current = existingRoom.winner;
        setLocalRole(role);
        setActiveRoomCode(code);
        setGameMode('multiplayer');
        setShowHome(false);
        setHint(null);
        return;
      }

      if (existingRoom.status !== 'waiting' || existingRoom.players.O.name.trim() !== '') {
        setMultiplayerError(`Room "${code}" is already full or has finished.`);
        return;
      }

      const updatedLogs = [
        `${cleanAgentName} [O] joined Room ${code}. Match live — ${existingRoom.players.X.name} [X] to move.`,
        ...existingRoom.logs,
      ].slice(0, 20);

      await joinRoomInDb(
        code,
        { uid: authUser?.uid ?? null, name: cleanAgentName, connected: true },
        updatedLogs
      );

      setMpStats({ X: 0, O: 0 });
      prevRoomWinnerRef.current = null;
      setLocalRole('O');
      setActiveRoomCode(code);
      setGameMode('multiplayer');
      setShowHome(false);
      setHint(null);
    } catch (err) {
      setMultiplayerError(
        extractReadableError(err, 'Unable to join room. Check Firebase security rules.')
      );
    } finally {
      setIsRoomBusy(false);
    }
  };

  const handleMultiplayerMove = useCallback(
    async (gridIndex: number, cellIndex: number) => {
      if (!isFirebaseConfigured || !activeRoomCode || !roomState || !localRole) return;
      if (roomState.status !== 'playing') return;
      if (localRole !== roomState.currentTurn) return;

      const currentBoard = roomToBoardState(roomState);
      if (!isValidMove(currentBoard, { gridIndex, cellIndex })) {
        return;
      }

      const nextState = makeMove(currentBoard, { gridIndex, cellIndex });
      const activePlayerName = roomState.players[localRole].name || `AGENT ${localRole}`;
      const newLogEntries = buildMoveLogEntries(
        localRole,
        activePlayerName,
        { gridIndex, cellIndex },
        nextState
      );
      const updatedLogs = [...newLogEntries, ...roomState.logs].slice(0, 20);

      try {
        await updateRoomInDb(activeRoomCode, {
          currentTurn: nextState.currentPlayer,
          nextGridIndex: nextState.nextGridIndex,
          grids: nextState.grids,
          gridWins: nextState.gridWins.map(toRoomWinner),
          winner: toRoomWinner(nextState.winner),
          lastMove: { gridIndex, cellIndex },
          status: nextState.winner ? 'finished' : 'playing',
          logs: updatedLogs,
        });
      } catch (err) {
        setMultiplayerError(extractReadableError(err, 'Failed to submit move.'));
      }
    },
    [activeRoomCode, roomState, localRole]
  );

  const handleRematch = async () => {
    if (!isFirebaseConfigured || !activeRoomCode || !roomState) return;
    const initialBoard = createInitialState();
    const hasOpponent = roomState.players.O.name.trim() !== '';
    const starterName = roomState.players.X.name || 'AGENT X';

    try {
      await updateRoomInDb(activeRoomCode, {
        status: hasOpponent ? 'playing' : 'waiting',
        currentTurn: 'X',
        nextGridIndex: null,
        grids: initialBoard.grids,
        gridWins: initialBoard.gridWins.map(toRoomWinner),
        winner: null,
        lastMove: null,
        logs: [
          `Rematch initialized. ${starterName} [X] to move.`,
          ...roomState.logs.slice(0, 10),
        ],
      });
    } catch (err) {
      setMultiplayerError(extractReadableError(err, 'Failed to reset match.'));
    }
  };

  const exitMultiplayerToLobby = useCallback(async () => {
    if (isFirebaseConfigured && activeRoomCode && localRole) {
      try {
        await disconnectPlayerInDb(activeRoomCode, localRole);
      } catch {
        // Ignore disconnect cleanup error
      }
    }
    setActiveRoomCode(null);
    setLocalRole(null);
    setRoomState(null);
    setMultiplayerError(null);
    prevRoomWinnerRef.current = null;
    setShowHome(true);
  }, [activeRoomCode, localRole]);

  const handleCopyRoomCode = async () => {
    if (!activeRoomCode) return;
    try {
      await navigator.clipboard.writeText(activeRoomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback ignored in restricted contexts
    }
  };

  // --- Solo Controls ---
  const resetSoloGame = () => {
    setGameState(createInitialState());
    setHistory([]);
    setHint(null);
    addCommentary('Chronal linkage established. Initializing new grid...');
  };

  const handleUndo = useCallback(() => {
    if (gameMode !== 'solo' || history.length < 2 || gameState.winner || isAiThinking) return;

    const remainingHistory = history.slice(2);
    let newState = createInitialState();

    [...remainingHistory].reverse().forEach((entry) => {
      newState = makeMove(newState, entry.move);
    });

    setGameState(newState);
    setHistory(remainingHistory);
    setHint(null);
    addCommentary('Chronal reversal initiated. Moves reverted.');
  }, [gameMode, history, gameState.winner, isAiThinking, addCommentary]);

  const getHint = () => {
    if (gameMode !== 'solo' || gameState.winner || gameState.currentPlayer !== 'X') return;
    const bestMove = getBestMove(gameState, 'Grandmaster');
    setHint(bestMove);
    addCommentary('Hint: Look at the highlighted square.');
  };

  // --- Derived Active Display State ---
  const isMultiplayer = gameMode === 'multiplayer' && Boolean(activeRoomCode);

  const activeBoard: BoardState = useMemo(() => {
    if (isMultiplayer && roomState) {
      return roomToBoardState(roomState);
    }
    return gameState;
  }, [isMultiplayer, roomState, gameState]);

  const activeLogs = useMemo(() => {
    if (isMultiplayer && roomState) {
      return roomState.logs.length > 0 ? roomState.logs : ['Connected to room.'];
    }
    return commentary;
  }, [isMultiplayer, roomState, commentary]);

  const canInteractBoard = useMemo(() => {
    if (isMultiplayer) {
      return Boolean(
        roomState &&
          roomState.status === 'playing' &&
          localRole &&
          roomState.currentTurn === localRole &&
          !roomState.winner
      );
    }
    return !isAiThinking && gameState.currentPlayer === 'X' && !gameState.winner;
  }, [isMultiplayer, roomState, localRole, isAiThinking, gameState]);

  const handleBoardMove = useCallback(
    (gridIndex: number, cellIndex: number) => {
      if (isMultiplayer) {
        void handleMultiplayerMove(gridIndex, cellIndex);
      } else {
        if (isAiThinking || gameState.currentPlayer !== 'X') return;
        handleSoloMove(gridIndex, cellIndex);
      }
    },
    [isMultiplayer, handleMultiplayerMove, isAiThinking, gameState.currentPlayer, handleSoloMove]
  );

  const winProb = useMemo(() => {
    if (activeBoard.winner === 'X') return 100;
    if (activeBoard.winner === 'O') return 0;
    if (activeBoard.winner === 'Draw') return 50;

    const score = evaluateHeuristic(activeBoard, 'X');
    const prob = 50 + score / 10;
    return Math.min(Math.max(Math.round(prob), 5), 95);
  }, [activeBoard]);

  const opponentRole: Player = localRole === 'X' ? 'O' : 'X';
  const opponentPlayer = roomState?.players[opponentRole];
  const opponentJoined = Boolean(opponentPlayer && opponentPlayer.name.trim() !== '');
  const opponentConnected = Boolean(opponentPlayer?.connected);

  // --- Home / Lobby View ---
  if (showHome) {
    return (
      <div
        className={`min-h-screen ${
          isDark ? 'bg-[#050505] text-white' : 'bg-slate-50 text-slate-900'
        } font-sans p-4 pt-20 md:p-12 flex flex-col items-center justify-center text-center relative selection:bg-cyan-500/30 transition-colors duration-700`}
      >
        <TechBackground isDark={isDark} />

        {/* Top bar on Home Screen */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-4 z-[50]">
          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-3 rounded-full transition-all ${
              isDark
                ? 'bg-white/5 text-yellow-400 hover:bg-white/10'
                : 'bg-black/5 text-indigo-600 hover:bg-black/10'
            }`}
            title="Toggle Dark / Light Mode"
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`w-full max-w-2xl p-5 sm:p-8 md:p-12 relative mx-auto overflow-hidden ${
            isDark
              ? 'glass'
              : 'bg-white/90 backdrop-blur-md border border-slate-300 rounded-2xl shadow-xl shadow-slate-200/60'
          }`}
        >
          <div className="relative group mb-8">
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter italic leading-none">
              <span className="relative inline-block">
                <span className="absolute -inset-2 bg-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <MultilingualUltimate isDark={isDark} />
              </span>
              <br />
              <span
                className={`${
                  isDark ? 'text-zinc-600' : 'text-slate-400'
                } font-light text-2xl sm:text-4xl md:text-5xl block mt-2`}
              >
                TIC·TAC·TOE
              </span>
            </h1>
          </div>
          <p
            className={`${
              isDark ? 'text-zinc-400' : 'text-slate-500'
            } uppercase tracking-[0.2em] md:tracking-[0.4em] text-[8px] md:text-[10px] mb-8 md:mb-10 font-mono`}
          >
            Tactical Grid Engine
          </p>

          {/* How to Play */}
          <div className="text-left space-y-4 md:space-y-5 mb-8 md:mb-10">
            <h2
              className={`text-[10px] uppercase tracking-widest font-bold border-l-2 border-cyan-500 pl-4 ${
                isDark ? 'text-zinc-500' : 'text-slate-400'
              }`}
            >
              How to Play
            </h2>
            <ul
              className={`space-y-2.5 md:space-y-3 text-xs md:text-sm font-light ${
                isDark ? 'text-zinc-300' : 'text-slate-600'
              }`}
            >
              <li className="flex gap-3 md:gap-4">
                <span className="text-cyan-500 font-mono">01.</span>
                <span>
                  The board has{' '}
                  <strong className={isDark ? 'text-white' : 'text-slate-900'}>9 small grids</strong>{' '}
                  inside one big grid.
                </span>
              </li>
              <li className="flex gap-3 md:gap-4">
                <span className="text-cyan-500 font-mono">02.</span>
                <span>
                  Where you play in a small grid{' '}
                  <strong className={isDark ? 'text-white' : 'text-slate-900'}>forces</strong> where
                  your opponent plays next.
                </span>
              </li>
              <li className="flex gap-3 md:gap-4">
                <span className="text-cyan-500 font-mono">03.</span>
                <span>Win a small grid by getting 3 in a row.</span>
              </li>
              <li className="flex gap-3 md:gap-4">
                <span className="text-cyan-500 font-mono">04.</span>
                <span>
                  Win the{' '}
                  <strong className={isDark ? 'text-white' : 'text-slate-900'}>whole game</strong>{' '}
                  by winning 3 small grids.
                </span>
              </li>
            </ul>
          </div>

          {/* Active Room Re-entry Banner (if returning to view rules) */}
          {activeRoomCode && (
            <div
              className={`mb-8 p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                isDark
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
                  : 'bg-cyan-50 border-cyan-300 text-cyan-900'
              }`}
            >
              <div className="text-xs font-mono text-left">
                Active Match in Room <strong className="tracking-widest">{activeRoomCode}</strong>{' '}
                (You are [{localRole}])
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setGameMode('multiplayer');
                    setShowHome(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-black text-[11px] font-black uppercase tracking-wider hover:bg-cyan-400 transition-colors"
                >
                  Return to Match
                </button>
                <button
                  onClick={() => void exitMultiplayerToLobby()}
                  className={`px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                    isDark
                      ? 'border-white/15 text-zinc-300 hover:bg-white/10'
                      : 'border-slate-300 text-slate-700 hover:bg-white'
                  }`}
                >
                  Leave Room
                </button>
              </div>
            </div>
          )}

          {/* Mode Selector */}
          <div className="flex flex-col gap-2 mb-6">
            <label
              className={`text-[9px] uppercase tracking-widest font-bold text-left ml-1 ${
                isDark ? 'text-zinc-500' : 'text-slate-400'
              }`}
            >
              Combat Mode
            </label>
            <div
              className={`grid grid-cols-2 p-1.5 rounded-xl border h-[56px] ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setGameMode('solo');
                  setMultiplayerError(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-lg text-[10px] sm:text-xs uppercase font-black tracking-wider transition-all ${
                  gameMode === 'solo'
                    ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.35)]'
                    : isDark
                      ? 'text-zinc-400 hover:text-white hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Cpu size={15} />
                <span>Solo vs AI</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGameMode('multiplayer');
                  setMultiplayerError(null);
                }}
                className={`flex items-center justify-center gap-2 rounded-lg text-[10px] sm:text-xs uppercase font-black tracking-wider transition-all ${
                  gameMode === 'multiplayer'
                    ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.35)]'
                    : isDark
                      ? 'text-zinc-400 hover:text-white hover:bg-white/5'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Users size={15} />
                <span>Online Multiplayer</span>
              </button>
            </div>
          </div>

          {/* Tactical Configuration Grid */}
          <div
            className={`grid grid-cols-1 ${
              gameMode === 'solo' ? 'md:grid-cols-2' : ''
            } gap-6 mb-8`}
          >
            {/* Player Agent Name Input */}
            <div className="flex flex-col gap-2">
              <label
                className={`text-[9px] uppercase tracking-widest font-bold text-left ml-1 ${
                  isDark ? 'text-zinc-500' : 'text-slate-400'
                }`}
              >
                Agent Name
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={playerName}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPlayerName(e.target.value.toUpperCase().slice(0, 15))}
                  placeholder="ENTER NAME"
                  className={`w-full border rounded-xl px-5 py-4 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all uppercase tracking-widest h-[60px] ${
                    isDark
                      ? 'bg-white/5 border-white/10 text-white focus:bg-white/10'
                      : 'bg-slate-100 border-slate-200 text-slate-800 focus:bg-white shadow-inner'
                  }`}
                />
              </div>
            </div>

            {/* AI Difficulty Selection (Solo Mode Only) */}
            {gameMode === 'solo' && (
              <div className="flex flex-col gap-2">
                <label
                  className={`text-[9px] uppercase tracking-widest font-bold text-left ml-1 ${
                    isDark ? 'text-zinc-500' : 'text-slate-400'
                  }`}
                >
                  AI Sensitivity Level
                </label>
                <div
                  className={`flex p-1.5 rounded-xl border h-[60px] ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'
                  }`}
                >
                  {(['Novice', 'Tactician', 'Grandmaster'] as Difficulty[]).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`flex-grow h-full rounded-lg text-[9px] md:text-[10px] uppercase font-black tracking-tighter md:tracking-widest transition-all ${
                        difficulty === level
                          ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.4)]'
                          : isDark
                            ? 'text-zinc-500 hover:text-white hover:bg-white/5'
                            : 'text-slate-400 hover:text-slate-900 hover:bg-white/50'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Section: Solo vs AI */}
          {gameMode === 'solo' && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      setGameMode('solo');
                      setShowHome(false);
                    }}
                    className={`flex-1 flex items-center justify-center gap-3 border font-black px-4 sm:px-8 py-4 sm:py-5 rounded-xl text-xs sm:text-sm tracking-[0.1em] sm:tracking-[0.2em] transition-all active:scale-[0.98] ${
                      isDark
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                        : 'bg-cyan-50 border-cyan-400 text-cyan-700 hover:bg-cyan-100'
                    }`}
                  >
                    RESUME MISSION
                  </button>
                )}
                <button
                  onClick={() => {
                    setGameMode('solo');
                    setShowHome(false);
                    resetSoloGame();
                  }}
                  className={`flex-1 flex items-center justify-center gap-3 ${
                    history.length > 0
                      ? isDark
                        ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                      : isDark
                        ? 'bg-white text-black hover:bg-cyan-400 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-cyan-400/20'
                        : 'bg-slate-900 text-white hover:bg-cyan-600 shadow-lg'
                  } font-black px-4 sm:px-8 py-4 sm:py-5 rounded-xl text-xs sm:text-sm tracking-[0.1em] sm:tracking-[0.2em] transition-all active:scale-[0.98] group`}
                >
                  <Play size={18} fill="currentColor" className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                  {history.length > 0 ? 'NEW MISSION' : 'START MISSION'}
                </button>
              </div>
            </div>
          )}

          {/* Action Section: Online Multiplayer */}
          {gameMode === 'multiplayer' && (
            <div className="flex flex-col gap-5 text-left">
              {/* Missing Firebase Env Vars Notice (Non-blocking) */}
              {!isFirebaseConfigured && (
                <div
                  className={`p-4 rounded-xl border text-xs leading-relaxed ${
                    isDark
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold uppercase tracking-wider mb-1.5">
                    <AlertTriangle size={15} className="text-amber-500 shrink-0" />
                    <span>Firebase Firestore Not Configured</span>
                  </div>
                  <p className="opacity-90 mb-2">
                    {firebaseInitError
                      ? firebaseInitError
                      : 'Online Multiplayer requires Firebase environment variables. Add them in .env.local (local) or Vercel Project Settings -> Environment Variables, then reload.'}
                  </p>
                  {missingFirebaseEnvVars.length > 0 && (
                    <div
                      className={`font-mono text-[10px] p-2.5 rounded-lg overflow-x-auto ${
                        isDark ? 'bg-black/40 text-amber-300' : 'bg-white/80 text-amber-950 border border-amber-200'
                      }`}
                    >
                      Missing: {missingFirebaseEnvVars.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Google Auth Gate for Firestore Multiplayer */}
              {isFirebaseConfigured && requiresAuth && (
                <div
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {!authReady ? (
                    <div className="text-xs font-mono opacity-70">Checking authentication...</div>
                  ) : authUser ? (
                    <>
                      <div className="text-xs">
                        <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>
                          Signed in as{' '}
                        </span>
                        <strong className={isDark ? 'text-white' : 'text-slate-900'}>
                          {authUser.displayName || authUser.email}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={handleGoogleSignOut}
                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          isDark
                            ? 'border-white/15 text-zinc-300 hover:bg-white/10'
                            : 'border-slate-300 text-slate-700 hover:bg-white'
                        }`}
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-xs">
                        <div className="font-bold uppercase tracking-wider text-cyan-500 text-[10px]">
                          Authentication Required
                        </div>
                        <p className={isDark ? 'text-zinc-400 mt-0.5' : 'text-slate-600 mt-0.5'}>
                          Sign in with Google to host or join live multiplayer rooms.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isAuthBusy}
                        onClick={handleGoogleSignIn}
                        className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                          isAuthBusy
                            ? 'opacity-50 cursor-not-allowed bg-zinc-600 text-zinc-200'
                            : 'bg-cyan-500 text-black hover:bg-cyan-400'
                        }`}
                      >
                        {isAuthBusy ? 'Signing In...' : 'Sign In with Google'}
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Create Room / Join Room Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Create Room Card */}
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-4 ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-cyan-500 mb-1">
                      Host Match [X]
                    </div>
                    <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                      Generate a {ROOM_CODE_LENGTH}-character room code and invite a challenger.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!canUseMultiplayer || isRoomBusy}
                    onClick={handleCreateRoom}
                    className={`w-full flex items-center justify-center gap-2 font-black px-5 py-3.5 rounded-xl text-xs uppercase tracking-[0.15em] transition-all ${
                      !canUseMultiplayer || isRoomBusy
                        ? 'opacity-40 cursor-not-allowed bg-zinc-700 text-zinc-300'
                        : isDark
                          ? 'bg-white text-black hover:bg-cyan-400 active:scale-[0.98]'
                          : 'bg-slate-900 text-white hover:bg-cyan-600 active:scale-[0.98]'
                    }`}
                  >
                    <Play size={15} fill="currentColor" />
                    <span>{isRoomBusy ? 'Creating...' : 'Create Room'}</span>
                  </button>
                </div>

                {/* Join Room Card */}
                <div
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-4 ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-pink-500 mb-1">
                      Join Match [O]
                    </div>
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) =>
                        setJoinCodeInput(
                          e.target.value
                            .toUpperCase()
                            .replace(/[^A-Z0-9]/g, '')
                            .slice(0, ROOM_CODE_LENGTH)
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && canUseMultiplayer && !isRoomBusy) {
                          void handleJoinRoom();
                        }
                      }}
                      placeholder={`ROOM CODE (${ROOM_CODE_LENGTH} CHARS)`}
                      disabled={!canUseMultiplayer || isRoomBusy}
                      className={`w-full mt-1 border rounded-lg px-3.5 py-2.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-pink-500 uppercase tracking-[0.15em] ${
                        isDark
                          ? 'bg-black/40 border-white/10 text-white placeholder:text-zinc-600'
                          : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                      }`}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={
                      !canUseMultiplayer ||
                      isRoomBusy ||
                      joinCodeInput.trim().length !== ROOM_CODE_LENGTH
                    }
                    onClick={handleJoinRoom}
                    className={`w-full flex items-center justify-center gap-2 font-black px-5 py-3.5 rounded-xl text-xs uppercase tracking-[0.15em] transition-all ${
                      !canUseMultiplayer ||
                      isRoomBusy ||
                      joinCodeInput.trim().length !== ROOM_CODE_LENGTH
                        ? 'opacity-40 cursor-not-allowed bg-zinc-700 text-zinc-300'
                        : 'bg-pink-500 text-white hover:bg-pink-400 active:scale-[0.98]'
                    }`}
                  >
                    <span>{isRoomBusy ? 'Joining...' : 'Join Room'}</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>

              {multiplayerError && (
                <div
                  className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                    isDark
                      ? 'bg-red-500/10 border-red-500/30 text-red-300'
                      : 'bg-red-50 border-red-200 text-red-700'
                  }`}
                >
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{multiplayerError}</span>
                </div>
              )}
            </div>
          )}
        </motion.div>

        <p
          className={`mt-10 text-[10px] font-mono tracking-widest uppercase ${
            isDark ? 'text-zinc-600' : 'text-slate-400'
          }`}
        >
          Select mode & deploy
        </p>
      </div>
    );
  }

  // --- Match Arena View ---
  const playerXLabel = isMultiplayer
    ? roomState?.players.X.name || 'AGENT X'
    : cleanAgentName;
  const playerOLabel = isMultiplayer
    ? roomState?.players.O.name || 'WAITING...'
    : 'ENGINE';

  const displayedWinner = activeBoard.winner;
  const didLocalPlayerWin = isMultiplayer
    ? displayedWinner === localRole
    : displayedWinner === 'X';
  const isMatchDraw = displayedWinner === 'Draw';

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'bg-[#050505] text-white' : 'bg-slate-50 text-slate-900'
      } flex flex-col items-center p-4 md:p-8 transition-colors duration-700 relative`}
    >
      <TechBackground isDark={isDark} />

      {/* Navigation & Controls */}
      <nav
        className={`w-full max-w-6xl flex flex-wrap items-center justify-between gap-3 mb-6 px-3 sm:px-6 py-3 sm:py-4 transition-all ${
          isDark
            ? 'glass border-white/5'
            : 'bg-white/90 backdrop-blur-md border border-slate-300 rounded-2xl shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <button
            onClick={() => setShowHome(true)}
            className={`flex items-center gap-1.5 transition-colors group ${
              isDark ? 'text-zinc-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Info size={14} className="group-hover:text-cyan-500 transition-colors" />
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold">
              Rules
            </span>
          </button>

          <div className={`h-4 w-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />

          {isMultiplayer && activeRoomCode ? (
            <>
              <button
                onClick={handleCopyRoomCode}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-mono font-bold tracking-widest transition-all ${
                  isDark
                    ? 'bg-white/5 border-white/10 text-cyan-400 hover:bg-white/10'
                    : 'bg-slate-100 border-slate-300 text-cyan-700 hover:bg-slate-200'
                }`}
                title="Copy Room Code"
              >
                <span>ROOM {activeRoomCode}</span>
                {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>

              <div
                className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider ${
                  !opponentJoined
                    ? isDark
                      ? 'text-amber-400'
                      : 'text-amber-600'
                    : opponentConnected
                      ? isDark
                        ? 'text-emerald-400'
                        : 'text-emerald-600'
                      : isDark
                        ? 'text-red-400'
                        : 'text-red-600'
                }`}
              >
                {!opponentJoined ? (
                  <>
                    <Users size={13} />
                    <span>Waiting for {opponentRole}</span>
                  </>
                ) : opponentConnected ? (
                  <>
                    <Wifi size={13} />
                    <span>Opponent Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={13} />
                    <span>Opponent Offline</span>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] sm:text-[10px] font-mono text-cyan-600 font-bold tracking-wider">
                {difficulty.toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {isMultiplayer && (
            <button
              onClick={() => void exitMultiplayerToLobby()}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all ${
                isDark
                  ? 'bg-white/5 border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
              title="Exit to Lobby"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">Exit</span>
            </button>
          )}

          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-lg transition-all ${
              isDark
                ? 'bg-white/5 text-yellow-500 hover:bg-white/10'
                : 'bg-slate-200 text-indigo-600 hover:bg-slate-300 border border-slate-300'
            }`}
            title="Toggle Dark / Light Mode"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={() => setShowLog(!showLog)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border transition-all ${
              showLog
                ? isDark
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-cyan-600 text-white border-cyan-700 shadow-md shadow-cyan-600/20'
                : isDark
                  ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <MessageSquare size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden xs:inline sm:inline">
              Log
            </span>
          </button>
        </div>
      </nav>

      {/* Multiplayer Waiting / Disconnect / Error Banners */}
      {isMultiplayer && (
        <div className="w-full max-w-[540px] mb-4 space-y-2">
          {roomState?.status === 'waiting' && activeRoomCode && (
            <div
              className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                isDark
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-100'
                  : 'bg-cyan-50 border-cyan-300 text-cyan-950'
              }`}
            >
              <div className="text-left">
                <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-500 font-bold">
                  Waiting for Opponent [O]
                </div>
                <div className="text-xs mt-0.5">
                  Share room code{' '}
                  <span className="font-mono font-black tracking-widest text-sm">
                    {activeRoomCode}
                  </span>{' '}
                  to begin.
                </div>
              </div>
              <button
                onClick={handleCopyRoomCode}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-black text-[11px] font-black uppercase tracking-wider hover:bg-cyan-400 transition-colors shrink-0"
              >
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
          )}

          {roomState && roomState.status !== 'waiting' && opponentJoined && !opponentConnected && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                isDark
                  ? 'bg-red-500/10 border-red-500/30 text-red-200'
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <WifiOff size={16} className="text-red-500 shrink-0" />
                <span>
                  <strong>{opponentPlayer?.name || `Player ${opponentRole}`}</strong> disconnected.
                  Waiting for them to reconnect...
                </span>
              </div>
              <button
                onClick={() => void exitMultiplayerToLobby()}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                  isDark
                    ? 'border-red-400/30 hover:bg-red-500/20'
                    : 'border-red-300 hover:bg-red-100'
                }`}
              >
                Leave
              </button>
            </div>
          )}

          {multiplayerError && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                isDark
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  : 'bg-amber-50 border-amber-300 text-amber-900'
              }`}
            >
              <AlertTriangle size={15} className="shrink-0" />
              <span>{multiplayerError}</span>
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 items-center lg:items-stretch justify-center relative">
        {/* Main Board Container */}
        <main className="flex-grow flex flex-col items-center justify-center order-1 lg:order-2">
          <div className="mb-5 text-center">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-none"
            >
              <span className="italic block sm:inline">
                <MultilingualUltimate isDark={isDark} />
              </span>
              <span
                className={`${
                  isDark ? 'text-zinc-600' : 'text-slate-400'
                } font-light text-xl sm:text-3xl md:text-4xl block sm:mt-0 sm:ml-4`}
              >
                TIC·TAC·TOE
              </span>
            </motion.h1>
            <p
              className={`text-[10px] uppercase tracking-[0.25em] mt-3 font-mono ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              }`}
            >
              {isMultiplayer
                ? roomState?.status === 'waiting'
                  ? `Room ${activeRoomCode} · Waiting for Challenger`
                  : activeBoard.winner
                    ? `Match Complete · Room ${activeRoomCode}`
                    : `${
                        canInteractBoard ? 'Your Turn' : "Opponent's Turn"
                      } [${activeBoard.currentPlayer}] · ${
                        activeBoard.nextGridIndex === null
                          ? 'Free Play'
                          : `Target: ${getGridName(activeBoard.nextGridIndex)}`
                      }`
                : activeBoard.winner
                  ? 'Match Complete'
                  : `${
                      activeBoard.currentPlayer === 'X' ? 'Your Turn' : 'AI Calculating...'
                    } · ${
                      activeBoard.nextGridIndex === null
                        ? 'Free Play'
                        : `Target: ${getGridName(activeBoard.nextGridIndex)}`
                    }`}
            </p>
          </div>

          <div
            className={`relative aspect-square w-full max-w-[540px] p-2 md:p-4 glass ${
              isDark ? 'border-white/20' : 'bg-white border-slate-300 shadow-xl shadow-slate-200/50'
            } flex flex-col items-center justify-center`}
          >
            <div className="grid grid-cols-3 grid-rows-3 gap-2 md:gap-4 w-full h-full">
              {activeBoard.grids.map((grid, idx) => (
                <SmallGrid
                  key={idx}
                  board={grid}
                  onMove={(cellIdx) => handleBoardMove(idx, cellIdx)}
                  isNextGrid={
                    !activeBoard.winner &&
                    (!isMultiplayer || roomState?.status === 'playing') &&
                    (activeBoard.nextGridIndex === idx ||
                      (activeBoard.nextGridIndex === null && activeBoard.gridWins[idx] === null))
                  }
                  winner={activeBoard.gridWins[idx]}
                  dimmed={
                    !activeBoard.winner &&
                    activeBoard.nextGridIndex !== null &&
                    activeBoard.nextGridIndex !== idx
                  }
                  canInteract={canInteractBoard}
                  hintIndex={!isMultiplayer && hint?.gridIndex === idx ? hint.cellIndex : null}
                  isDark={isDark}
                />
              ))}
            </div>

            {/* Game Over Overlay */}
            <AnimatePresence>
              {displayedWinner && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`absolute inset-0 z-[100] flex flex-col items-center justify-center p-4 md:p-8 text-center overflow-hidden transition-all duration-1000 ${
                    !isMatchDraw && !didLocalPlayerWin
                      ? 'bg-black/95 backdrop-blur-[20px]'
                      : 'bg-black/40 backdrop-blur-md'
                  }`}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    className={`w-full max-w-sm md:max-w-md ${
                      isDark ? 'glass' : 'bg-white'
                    } p-6 md:p-10 flex flex-col items-center shadow-2xl relative border-none`}
                  >
                    {!isMatchDraw && !didLocalPlayerWin ? (
                      <div className="flex flex-col items-center w-full">
                        <Skull className="text-red-600 mb-4 md:mb-6 drop-shadow-[0_0_20px_rgba(220,38,38,0.6)] animate-bounce w-12 h-12 md:w-16 md:h-16" />
                        <h2 className="text-2xl md:text-4xl font-black mb-2 md:mb-4 tracking-tighter text-red-600 italic uppercase">
                          SYSTEM OVERRIDE
                        </h2>
                        <p className="hidden sm:block text-red-400/80 font-mono text-[10px] md:text-xs mb-6 md:mb-8 tracking-widest leading-relaxed">
                          {isMultiplayer
                            ? `${
                                roomState?.players[displayedWinner as Player]?.name ||
                                `Player ${displayedWinner}`
                              } [${displayedWinner}] captured the tactical grid.`
                            : 'CRITICAL FAILURE. CONNECTION SEVERED.'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                          <button
                            onClick={isMultiplayer ? handleRematch : resetSoloGame}
                            className="w-full sm:w-auto bg-red-600 text-white font-black px-6 md:px-8 py-3 md:py-4 rounded-xl text-xs md:text-sm tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-[0_0_30px_rgba(220,38,38,0.4)]"
                          >
                            {isMultiplayer ? 'REMATCH' : 'RETRY CONNECTION'}
                          </button>
                          {isMultiplayer && (
                            <button
                              onClick={() => void exitMultiplayerToLobby()}
                              className="w-full sm:w-auto bg-white/10 text-white font-bold px-6 py-3 md:py-4 rounded-xl text-xs tracking-widest hover:bg-white/20 transition-all"
                            >
                              LOBBY
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center w-full">
                        <div className="relative mb-6 md:mb-8">
                          <Trophy
                            className={`${
                              didLocalPlayerWin ? 'neon-cyan' : 'text-zinc-400'
                            } w-12 h-12 md:w-16 md:h-16`}
                          />
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                            className="absolute inset-0 border-2 border-dashed border-cyan-500/20 rounded-full scale-125 md:scale-150"
                          />
                        </div>
                        <h2
                          className={`text-2xl md:text-4xl font-black mb-2 md:mb-4 tracking-tighter ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {isMatchDraw ? 'NEUTRALIZED' : 'MISSION COMPLETE'}
                        </h2>
                        <p
                          className={`hidden sm:block text-xs md:text-sm mb-6 md:mb-8 font-mono tracking-wide ${
                            isDark ? 'text-zinc-400' : 'text-slate-500'
                          }`}
                        >
                          {isMatchDraw
                            ? 'Strategic parity achieved in all sectors.'
                            : isMultiplayer
                              ? `Victory secured as Agent [${localRole}].`
                              : 'Optimal tactical sequence accomplished.'}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                          <button
                            onClick={isMultiplayer ? handleRematch : resetSoloGame}
                            className="w-full sm:w-auto bg-cyan-500 text-black font-black px-6 md:px-8 py-3 md:py-4 rounded-xl text-xs md:text-sm tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-[0_0_30px_rgba(34,211,238,0.3)]"
                          >
                            {isMultiplayer ? 'REMATCH' : 'NEW DEPLOYMENT'}
                          </button>
                          {isMultiplayer && (
                            <button
                              onClick={() => void exitMultiplayerToLobby()}
                              className={`w-full sm:w-auto font-bold px-6 py-3 md:py-4 rounded-xl text-xs tracking-widest transition-all ${
                                isDark
                                  ? 'bg-white/10 text-white hover:bg-white/20'
                                  : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
                              }`}
                            >
                              LOBBY
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Current Status Bar */}
          <div className="mt-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
              <div
                className={`
                px-4 py-2 rounded-lg border flex items-center gap-3 transition-all duration-500
                ${
                  activeBoard.currentPlayer === 'X' && !activeBoard.winner
                    ? 'bg-cyan-500/10 border-cyan-500/30'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-800 opacity-50'
                      : 'bg-slate-100 border-slate-300 opacity-60'
                }
              `}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isMultiplayer && !roomState?.players.X.connected
                      ? 'bg-red-500'
                      : activeBoard.currentPlayer === 'X' && !activeBoard.winner
                        ? 'bg-cyan-500 animate-pulse'
                        : isDark
                          ? 'bg-zinc-700'
                          : 'bg-slate-300'
                  }`}
                />
                <span
                  className={`text-xs font-bold tracking-widest ${
                    activeBoard.currentPlayer === 'X'
                      ? 'text-cyan-500'
                      : isDark
                        ? 'text-zinc-400'
                        : 'text-slate-500'
                  }`}
                >
                  {playerXLabel} [X]{isMultiplayer && localRole === 'X' ? ' · YOU' : ''}
                  {isMultiplayer ? ` (${mpStats.X})` : stats.X > 0 ? ` (${stats.X})` : ''}
                </span>
              </div>

              <div className="text-slate-400 font-mono text-xs">VS</div>

              <div
                className={`
                px-4 py-2 rounded-lg border flex items-center gap-3 transition-all duration-500
                ${
                  activeBoard.currentPlayer === 'O' && !activeBoard.winner
                    ? 'bg-pink-500/10 border-pink-500/30'
                    : isDark
                      ? 'bg-zinc-900 border-zinc-800 opacity-50'
                      : 'bg-slate-100 border-slate-300 opacity-60'
                }
              `}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    isMultiplayer &&
                    roomState?.players.O.name &&
                    !roomState?.players.O.connected
                      ? 'bg-red-500'
                      : activeBoard.currentPlayer === 'O' && !activeBoard.winner
                        ? 'bg-pink-500 animate-pulse'
                        : isDark
                          ? 'bg-zinc-700'
                          : 'bg-slate-300'
                  }`}
                />
                <span
                  className={`text-xs font-bold tracking-widest ${
                    activeBoard.currentPlayer === 'O'
                      ? 'text-pink-500'
                      : isDark
                        ? 'text-zinc-400'
                        : 'text-slate-500'
                  }`}
                >
                  {playerOLabel} [O]{isMultiplayer && localRole === 'O' ? ' · YOU' : ''}
                  {isMultiplayer ? ` (${mpStats.O})` : stats.O > 0 ? ` (${stats.O})` : ''}
                </span>
              </div>
            </div>

            <div className={`h-8 w-px ${isDark ? 'bg-white/10' : 'bg-slate-300'} hidden md:block`} />

            <div className="flex items-center gap-2">
              {!isMultiplayer && (
                <>
                  <button
                    onClick={getHint}
                    disabled={!!gameState.winner || gameState.currentPlayer !== 'X'}
                    className={`p-2 rounded-lg border transition-all ${
                      !!gameState.winner || gameState.currentPlayer !== 'X'
                        ? 'opacity-20 cursor-not-allowed border-zinc-800'
                        : isDark
                          ? 'border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-500 shadow-sm'
                          : 'border-yellow-500/40 bg-white hover:bg-yellow-50 text-yellow-600 shadow-sm'
                    }`}
                    title="Tactical Hint"
                  >
                    <Lightbulb size={18} />
                  </button>
                  <button
                    onClick={handleUndo}
                    disabled={history.length < 2 || !!gameState.winner || isAiThinking}
                    className={`p-2 rounded-lg border transition-all ${
                      history.length < 2 || !!gameState.winner || isAiThinking
                        ? 'opacity-20 cursor-not-allowed border-zinc-800'
                        : isDark
                          ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                          : 'bg-white border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                    title="Undo Move"
                  >
                    <Undo2 size={18} />
                  </button>
                </>
              )}

              <button
                onClick={isMultiplayer ? handleRematch : resetSoloGame}
                disabled={isMultiplayer && roomState?.status !== 'finished'}
                className={`p-2 rounded-lg border transition-all ${
                  isMultiplayer && roomState?.status !== 'finished'
                    ? 'opacity-20 cursor-not-allowed border-zinc-800'
                    : isDark
                      ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                      : 'bg-white border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title={
                  isMultiplayer
                    ? roomState?.status === 'finished'
                      ? 'Rematch'
                      : 'Rematch available once match finishes'
                    : 'Reset Match'
                }
              >
                <RefreshCw size={18} />
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Tactical Log (Toggleable) */}
        <AnimatePresence>
          {showLog && (
            <motion.aside
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full lg:w-[540px] flex flex-col order-3 overflow-hidden shrink-0 mx-auto"
            >
              <div
                className={`h-full p-6 flex flex-col ${
                  isDark
                    ? 'glass'
                    : 'bg-white border border-slate-300 rounded-2xl shadow-xl shadow-slate-200/50'
                }`}
              >
                <div className="flex items-center justify-between mb-8">
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-600 font-black flex items-center gap-2">
                      <MessageSquare size={14} />
                      Tactical Analysis
                    </div>
                    <div className={`text-[9px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                      {isMultiplayer ? `ROOM_${activeRoomCode}_SYNC` : 'SECTOR_ANALYSIS_V4'}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLog(false)}
                    className={`p-1 rounded transition-colors ${
                      isDark
                        ? 'hover:bg-white/10 text-zinc-600 hover:text-white'
                        : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    <CloseIcon size={14} />
                  </button>
                </div>

                {/* Win Probability / Board Balance Display at Top */}
                <div
                  className={`mb-8 p-4 rounded-xl border relative overflow-hidden ${
                    isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-end mb-3">
                    <div
                      className={`text-[10px] uppercase tracking-widest font-bold ${
                        isDark ? 'text-zinc-500' : 'text-slate-400'
                      }`}
                    >
                      {isMultiplayer ? 'X Sector Advantage' : 'Your Win Probability'}
                    </div>
                    <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {winProb}% <span className="text-[10px] text-zinc-500 font-light">PROB</span>
                    </div>
                  </div>
                  <div
                    className={`h-3 rounded-full overflow-hidden flex ${
                      isDark ? 'bg-zinc-900' : 'bg-slate-200'
                    }`}
                  >
                    <motion.div
                      initial={{ width: '50%' }}
                      animate={{ width: `${winProb}%` }}
                      className="h-full bg-gradient-to-r from-pink-500 via-cyan-500 to-cyan-400 relative"
                    >
                      <div
                        className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-scan"
                        style={{ width: '40px' }}
                      />
                    </motion.div>
                  </div>
                  <div className="flex justify-between mt-2 text-[8px] font-mono uppercase tracking-[0.2em]">
                    <span
                      className={
                        winProb < 50 ? 'text-pink-500' : isDark ? 'text-zinc-600' : 'text-slate-300'
                      }
                    >
                      O FAVOR
                    </span>
                    <span className={isDark ? 'text-zinc-700' : 'text-slate-300'}>MID_POINT</span>
                    <span
                      className={
                        winProb > 50 ? 'text-cyan-600' : isDark ? 'text-zinc-600' : 'text-slate-300'
                      }
                    >
                      X FAVOR
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar flex-grow max-h-[380px]">
                  <AnimatePresence mode="popLayout">
                    {activeLogs.map((msg, i) => (
                      <motion.div
                        key={msg + (activeLogs.length - i)}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: Math.max(0.35, 1 - i * 0.12), x: 0 }}
                        exit={{ opacity: 0 }}
                        className={`
                          p-4 rounded-xl text-[11px] leading-relaxed relative overflow-hidden group
                          ${
                            i === 0
                              ? isDark
                                ? 'bg-cyan-500/10 border border-cyan-500/30 text-white'
                                : 'bg-cyan-50 border border-cyan-300 text-cyan-900 shadow-sm'
                              : isDark
                                ? 'bg-white/5 text-zinc-400 border border-white/5'
                                : 'bg-white text-slate-500 border border-slate-200'
                          }
                        `}
                      >
                        {i === 0 && (
                          <div className="absolute left-0 top-0 w-1 h-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]" />
                        )}
                        <div className="font-mono opacity-50 mb-1 flex justify-between">
                          <span>LOG_ENTRY_{activeLogs.length - i}</span>
                          {i === 0 && (
                            <span className="animate-pulse text-cyan-600 text-[9px] font-bold">
                              {isMultiplayer ? 'LIVE' : 'ANALYZING...'}
                            </span>
                          )}
                        </div>
                        <p className="font-medium">&ldquo;{msg}&rdquo;</p>

                        {i === 0 && (
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.5 }}
                            className="h-[1px] w-full bg-cyan-500/30 mt-3"
                          />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <footer
        className={`mt-12 text-[10px] font-mono tracking-widest flex items-center gap-4 transition-colors ${
          isDark ? 'text-zinc-700' : 'text-slate-400'
        }`}
      >
        <span>{isMultiplayer ? `ROOM_${activeRoomCode}` : 'SOLO_AI_SESSION'}</span>
        <span className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
        <span>{isMultiplayer ? 'REALTIME_SYNC' : 'LOCAL_ENGINE'}</span>
      </footer>
    </div>
  );
}
