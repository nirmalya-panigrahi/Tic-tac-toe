/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RefreshCw, BrainCircuit, ChevronRight, MessageSquare, Info, Play, Lightbulb, X as CloseIcon, Undo2 } from 'lucide-react';
import { Player, BoardState, Move, Difficulty, GameHistoryEntry } from './types';
import { createInitialState, makeMove, isValidMove } from './lib/gameEngine';
import { getBestMove, evaluateHeuristic } from './lib/aiEngine';

// --- Sub-components ---

const SpaceBackground = React.memo(() => {
  const stars = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: `${Math.random() * 2 + 1}px`,
    duration: `${Math.random() * 3 + 2}s`,
  })), []);

  const shooters = useMemo(() => Array.from({ length: 3 }).map((_, i) => ({
    id: i,
    top: `${Math.random() * 50}%`,
    left: `${Math.random() * 50}%`,
    duration: `${Math.random() * 10 + 5}s`,
    delay: `${Math.random() * 10}s`,
  })), []);

  const lasers = useMemo(() => Array.from({ length: 6 }).map((_, i) => ({
    id: i,
    startX: `${Math.random() * 100}vw`,
    startY: `${Math.random() * 100}vh`,
    endX: `${Math.random() * 100}vw`,
    endY: `${Math.random() * 100}vh`,
    angle: `${Math.random() * 360}deg`,
    duration: `${Math.random() * 2 + 1}s`,
    delay: `${Math.random() * 5}s`,
    color: i % 2 === 0 ? 'cyan' : 'pink'
  })), []);

  return (
    <div className="space-container">
      {stars.map(s => (
        <div 
          key={s.id} 
          className="star" 
          style={{ 
            top: s.top, 
            left: s.left, 
            width: s.size, 
            height: s.size, 
            animation: `twinkle ${s.duration} infinite ease-in-out` 
          } as any} 
        />
      ))}
      {shooters.map(s => (
        <div 
          key={s.id} 
          className="shooting-star" 
          style={{ 
            top: s.top, 
            left: s.left, 
            animation: `shoot ${s.duration} linear infinite`,
            animationDelay: s.delay 
          } as any} 
        />
      ))}
      {lasers.map(l => (
        <div 
          key={l.id} 
          className={`laser laser-${l.color}`} 
          style={{ 
            '--startX': l.startX, '--startY': l.startY, 
            '--endX': l.endX, '--endY': l.endY, 
            '--angle': l.angle, 
            animation: `laser-fire ${l.duration} linear infinite`,
            animationDelay: l.delay 
          } as any} 
        />
      ))}
    </div>
  );
});

interface CellProps {
  value: Player | null;
  onClick: () => void;
  isNextGrid: boolean;
  isValid: boolean;
  isHint?: boolean;
}

const Cell: React.FC<CellProps> = ({ value, onClick, isNextGrid, isValid, isHint }) => {
  return (
    <motion.div
      whileHover={isValid ? { backgroundColor: 'rgba(34, 211, 238, 0.1)' } : {}}
      whileTap={isValid ? { scale: 0.95 } : {}}
      onClick={onClick}
      className={`
        relative h-full w-full flex items-center justify-center rounded-sm transition-colors cursor-pointer
        ${isValid ? 'bg-white/5 hover:bg-white/10' : 'bg-transparent cursor-not-allowed'}
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
  hintIndex?: number | null;
}

const SmallGrid: React.FC<GridProps> = ({ board, onMove, isNextGrid, winner, dimmed, hintIndex }) => {
  return (
    <div className={`
      relative grid grid-cols-3 grid-rows-3 gap-1 p-1 transition-all duration-300
      ${isNextGrid ? 'glass border-active animate-pulse-cyan ring-1 ring-cyan-500/30 ring-inset bg-cyan-500/5' : 'glass border-white/10'}
      ${dimmed ? 'grid-dimmed' : ''}
    `}>
      {board.map((cell, idx) => (
        <Cell
          key={idx}
          value={cell}
          onClick={() => onMove(idx)}
          isNextGrid={isNextGrid}
          isValid={!winner && (isNextGrid || dimmed === false) && cell === null}
          isHint={hintIndex === idx}
        />
      ))}
      
      <AnimatePresence>
        {winner && winner !== 'Draw' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`winning-overlay absolute inset-0 text-5xl z-10 ${winner === 'X' ? 'neon-cyan' : 'neon-pink'}`}
          >
            {winner}
          </motion.div>
        )}
        {winner === 'Draw' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="winning-overlay absolute inset-0 text-2xl text-zinc-500 z-10"
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
  const [gameState, setGameState] = useState<BoardState>(createInitialState());
  const [difficulty, setDifficulty] = useState<Difficulty>('Tactician');
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [commentary, setCommentary] = useState<string[]>(["Welcome Commander. Make your first move."]);
  const [stats, setStats] = useState({ X: 0, O: 0 });
  const [isAiThinking, setIsAiThinking] = useState(false);
  
  // New State for Home Screen and Toggles
  const [showHome, setShowHome] = useState(true);
  const [playerName, setPlayerName] = useState('PILOT');
  const [showLog, setShowLog] = useState(false);
  const [hint, setHint] = useState<Move | null>(null);

  const addCommentary = useCallback((msg: string) => {
    setCommentary(prev => [msg, ...prev].slice(0, 5));
  }, []);

  const getGridName = (idx: number) => {
    const rows = ['Top', 'Middle', 'Bottom'];
    const cols = ['Left', 'Center', 'Right'];
    return `${rows[Math.floor(idx / 3)]} ${cols[idx % 3]}`;
  };

  const handleMove = useCallback((gridIndex: number, cellIndex: number) => {
    if (!isValidMove(gameState, { gridIndex, cellIndex })) {
      return;
    }

    setHint(null); // Clear hint on move
    const currentPlayer = gameState.currentPlayer;

    // Tactical Analysis for Human Player
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
    setHistory(prev => [{ move: { gridIndex, cellIndex }, player: currentPlayer, timestamp: Date.now(), analysis }, ...prev]);

    const moveDesc = `${currentPlayer} played in ${getGridName(gridIndex)} grid, ${getGridName(cellIndex)} spot.`;
    addCommentary(analysis ? `${moveDesc} ${analysis}` : moveDesc);

    if (nextState.nextGridIndex === null && !nextState.winner) {
      addCommentary("Board open: Play in any available grid.");
    } else if (nextState.gridWins[gridIndex] === currentPlayer) {
      addCommentary(`Sector Secured: ${currentPlayer} won the ${getGridName(gridIndex)} grid!`);
    }

    if (nextState.winner) {
      if (nextState.winner === 'Draw') {
        addCommentary("Conflict Terminated: Tactical Draw.");
      } else {
        addCommentary(`Victory Sequence: ${nextState.winner} wins the overall board!`);
        setStats(s => ({ ...s, [nextState.winner as Player]: s[nextState.winner as Player] + 1 }));
      }
    }
  }, [gameState, addCommentary]);

  // AI Effect
  useEffect(() => {
    if (!showHome && gameState.currentPlayer === 'O' && !gameState.winner) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        const move = getBestMove(gameState, difficulty);
        handleMove(move.gridIndex, move.cellIndex);
        setIsAiThinking(false);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState, difficulty, handleMove, showHome]);

  const resetGame = () => {
    setGameState(createInitialState());
    setHistory([]);
    setHint(null);
    addCommentary("Chronal linkage established. Initializing new grid...");
  };

  const handleUndo = useCallback(() => {
    if (history.length < 2 || gameState.winner || isAiThinking) return;
    
    // History is [O_move, X_move, ...]
    const remainingHistory = history.slice(2);
    let newState = createInitialState();
    
    // Replay history
    [...remainingHistory].reverse().forEach(entry => {
      newState = makeMove(newState, entry.move);
    });
    
    setGameState(newState);
    setHistory(remainingHistory);
    setHint(null);
    addCommentary("Chronal reversal initiated. Moves reverted.");
  }, [history, gameState.winner, isAiThinking, addCommentary]);

  const toggleDifficulty = () => {
    const levels: Difficulty[] = ['Novice', 'Tactician', 'Grandmaster'];
    const next = levels[(levels.indexOf(difficulty) + 1) % levels.length];
    setDifficulty(next);
    addCommentary(`Difficulty: ${next}`);
  };

  const getHint = () => {
    if (gameState.winner || gameState.currentPlayer !== 'X') return;
    const bestMove = getBestMove(gameState, 'Grandmaster'); // Hint always uses best logic
    setHint(bestMove);
    addCommentary("Hint: Look at the highlighted square.");
  };

  const winProb = useMemo(() => {
    if (gameState.winner === 'X') return 100;
    if (gameState.winner === 'O') return 0;
    if (gameState.winner === 'Draw') return 50;
    
    const score = evaluateHeuristic(gameState, 'X');
    // Map -500 to 500 range roughly to 10% - 90%
    const prob = 50 + (score / 10);
    return Math.min(Math.max(Math.round(prob), 5), 95);
  }, [gameState]);

  if (showHome) {
    return (
      <div className="min-h-screen bg-[#050505] text-white font-sans p-4 md:p-12 flex flex-col items-center justify-center text-center relative selection:bg-cyan-500/30">
        {/* Animated Background */}
        <SpaceBackground />
        <div className="bg-orb bg-orb-1" />
        <div className="bg-orb bg-orb-2" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl glass p-6 md:p-12 relative"
        >
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4 italic">
            ULTIMATE <span className="text-zinc-600 font-light">TIC-TAC-TOE</span>
          </h1>
          <p className="text-zinc-400 uppercase tracking-[0.4em] text-[10px] mb-12 font-mono">Tactical Grid Engine v2.5.1</p>

          <div className="text-left space-y-6 mb-12">
            <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-bold border-l-2 border-cyan-500 pl-4">How to Play</h2>
            <ul className="space-y-4 text-sm text-zinc-300 font-light">
              <li className="flex gap-4">
                <span className="text-cyan-500 font-mono">01.</span>
                <span>The board has <strong className="text-white">9 small grids</strong> inside one big grid.</span>
              </li>
              <li className="flex gap-4">
                <span className="text-cyan-500 font-mono">02.</span>
                <span>Where you play in a small grid <strong className="text-white">forces</strong> where your opponent plays next.</span>
              </li>
              <li className="flex gap-4">
                <span className="text-cyan-500 font-mono">03.</span>
                <span>Win a small grid by getting 3 in a row.</span>
              </li>
              <li className="flex gap-4">
                <span className="text-cyan-500 font-mono">04.</span>
                <span>Win the <strong className="text-white">whole game</strong> by winning 3 small grids in a row on the big board.</span>
              </li>
            </ul>
          </div>

          {/* Tactical Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Player Callsign Input */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold text-left ml-1">
                Callsign [15 CHAR MAX]
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={playerName}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPlayerName(e.target.value.toUpperCase().slice(0, 15))}
                  placeholder="ENTER CALLSIGN"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm font-mono focus:outline-none focus:border-cyan-500 focus:bg-white/10 transition-all uppercase tracking-widest text-white h-[60px]"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-mono text-zinc-600 group-focus-within:text-cyan-500">
                  {playerName.length}/15
                </div>
              </div>
            </div>

            {/* AI Difficulty Selection */}
            <div className="flex flex-col gap-2">
              <label className="text-[9px] uppercase tracking-widest text-zinc-500 font-bold text-left ml-1">
                AI Sensitivity Level
              </label>
              <div className="flex bg-white/5 p-1.5 rounded-xl border border-white/10 h-[60px]">
                {(['Novice', 'Tactician', 'Grandmaster'] as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`flex-grow h-full rounded-lg text-[9px] md:text-[10px] uppercase font-black tracking-tighter md:tracking-widest transition-all ${difficulty === level ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.4)]' : 'text-zinc-500 hover:text-white hover:bg-white/5'}`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              {history.length > 0 && (
                <button
                  onClick={() => setShowHome(false)}
                  className="flex-1 flex items-center justify-center gap-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-black px-8 py-5 rounded-xl tracking-[0.2em] hover:bg-cyan-500/20 transition-all active:scale-[0.98] group"
                >
                  RESUME MISSION
                </button>
              )}
              <button
                onClick={() => { setShowHome(false); resetGame(); }}
                className={`flex-1 flex items-center justify-center gap-3 ${history.length > 0 ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-white text-black hover:bg-cyan-400 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-cyan-400/20'} font-black px-8 py-5 rounded-xl tracking-[0.2em] transition-all active:scale-[0.98] group`}
              >
                <Play size={18} fill="currentColor" />
                {history.length > 0 ? 'NEW MISSION' : 'START MISSION'}
              </button>
            </div>
          </div>
        </motion.div>

        <p className="mt-12 text-zinc-800 text-[10px] font-mono tracking-widest uppercase">Select mode & deploy</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-4 md:p-8 flex flex-col items-center justify-center relative selection:bg-cyan-500/30">
      {/* Animated Background Orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      
      {/* Top Navigation Bar */}
      <nav className="w-full max-w-6xl flex justify-between items-center mb-8 glass px-6 py-4 border-white/5">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowHome(true)}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors group"
          >
            <Info size={16} className="group-hover:text-cyan-500 transition-colors" />
            <span className="text-[10px] uppercase tracking-widest font-bold">Rules</span>
          </button>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">Mode:</span>
            <span className="text-[10px] font-mono text-cyan-500">{difficulty.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={getHint}
            disabled={!!gameState.winner || gameState.currentPlayer !== 'X'}
            className={`p-2 rounded-lg border transition-all ${!!gameState.winner || gameState.currentPlayer !== 'X' ? 'opacity-20 cursor-not-allowed border-zinc-800' : 'border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-500 shadow-sm hover:shadow-yellow-500/10'}`}
            title="Hint"
          >
            <Lightbulb size={18} />
          </button>
          <button 
            onClick={() => setShowLog(!showLog)}
            className={`p-2 rounded-lg border transition-all ${showLog ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-white/5 border-white/10 text-zinc-500 hover:text-white'}`}
          >
            <MessageSquare size={18} />
          </button>
        </div>
      </nav>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 items-center lg:items-stretch justify-center relative">
        <SpaceBackground />
        
        {/* Main Board Container */}
        <main className="flex-grow flex flex-col items-center justify-center order-1 lg:order-2">
          <div className="mb-6 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-extrabold tracking-tighter"
            >
              ULTIMATE <span className="text-zinc-600">TIC-TAC-TOE</span>
            </motion.h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-[0.3em] mt-2 font-mono">Tactical Grid Engine v2.4.9</p>
          </div>

          <div className="relative aspect-square w-full max-w-[540px] p-2 md:p-4 glass border-white/20 flex flex-col items-center justify-center">
             <div className="grid grid-cols-3 grid-rows-3 gap-2 md:gap-4 w-full h-full">
                {gameState.grids.map((grid, idx) => (
                  <SmallGrid
                    key={idx}
                    board={grid}
                    onMove={(cellIdx) => handleMove(idx, cellIdx)}
                    isNextGrid={!gameState.winner && (gameState.nextGridIndex === idx || (gameState.nextGridIndex === null && gameState.gridWins[idx] === null))}
                    winner={gameState.gridWins[idx]}
                    dimmed={!gameState.winner && gameState.nextGridIndex !== null && gameState.nextGridIndex !== idx}
                    hintIndex={hint?.gridIndex === idx ? hint.cellIndex : null}
                  />
                ))}
             </div>

             {/* Game Over Overlay */}
             <AnimatePresence>
                {gameState.winner && (
                  <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center p-8 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      className="glass p-12 flex flex-col items-center"
                    >
                      <Trophy size={64} className={gameState.winner === 'X' ? 'neon-cyan' : gameState.winner === 'O' ? 'neon-pink' : 'text-zinc-500'} />
                      <h2 className="text-4xl font-black mt-6 mb-2">
                        {gameState.winner === 'Draw' ? 'STALEMATE' : `${gameState.winner} VICTORIOUS`}
                      </h2>
                      <p className="text-zinc-400 text-sm mb-8">The grid has been resolved.</p>
                      <button
                        onClick={resetGame}
                        className="group flex items-center gap-2 bg-white/10 hover:bg-white/20 px-8 py-3 rounded-full transition-all border border-white/10"
                      >
                        <RefreshCw size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                        INITIATE RESTART
                      </button>
                    </motion.div>
                  </motion.div>
                )}
             </AnimatePresence>
          </div>

          {/* Current Status Bar */}
          <div className="mt-8 flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-4">
              <div className={`
                px-4 py-2 rounded-lg border flex items-center gap-3 transition-all duration-500
                ${gameState.currentPlayer === 'X' ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-zinc-900 border-zinc-800 opacity-40'}
              `}>
                <div className={`w-2 h-2 rounded-full ${gameState.currentPlayer === 'X' ? 'bg-cyan-500 animate-pulse' : 'bg-zinc-700'}`} />
                <span className={`text-xs font-bold tracking-widest ${gameState.currentPlayer === 'X' ? 'text-cyan-400' : 'text-zinc-500'}`}>{playerName} [X]</span>
              </div>
              <div className="text-zinc-700 font-mono text-xs">VS</div>
              <div className={`
                px-4 py-2 rounded-lg border flex items-center gap-3 transition-all duration-500
                ${gameState.currentPlayer === 'O' ? 'bg-pink-500/10 border-pink-500/30' : 'bg-zinc-900 border-zinc-800 opacity-40'}
              `}>
                <div className={`w-2 h-2 rounded-full ${gameState.currentPlayer === 'O' ? 'bg-pink-500 animate-pulse' : 'bg-zinc-700'}`} />
                <span className={`text-xs font-bold tracking-widest ${gameState.currentPlayer === 'O' ? 'text-pink-400' : 'text-zinc-500'}`}>ENGINE [O]</span>
              </div>
            </div>

            <div className="h-8 w-px bg-white/10 hidden md:block" />

            <div className="flex items-center gap-2">
              <button
                onClick={handleUndo}
                disabled={history.length < 2 || !!gameState.winner || isAiThinking}
                className={`p-2 rounded-lg border transition-all ${history.length < 2 || !!gameState.winner || isAiThinking ? 'opacity-20 cursor-not-allowed border-zinc-800' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                title="Undo Move"
              >
                <Undo2 size={18} />
              </button>
              <button
                onClick={resetGame}
                className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                title="Reset Match"
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
              className="w-full max-w-[540px] flex flex-col order-3 overflow-hidden shrink-0 mx-auto"
            >
              <div className="glass h-full p-6 flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-500 font-black flex items-center gap-2">
                      <MessageSquare size={14} />
                      Tactical Analysis
                    </div>
                    <div className="text-[9px] text-zinc-500 font-mono">SECTOR_ANALYSIS_V4</div>
                  </div>
                  <button onClick={() => setShowLog(false)} className="p-1 rounded hover:bg-white/10 text-zinc-600 hover:text-white transition-colors">
                    <CloseIcon size={14} />
                  </button>
                </div>

                {/* Win Probability Display at Top */}
                <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10 relative overflow-hidden">
                  <div className="flex justify-between items-end mb-3">
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Projected Outcome</div>
                    <div className="text-xl font-black text-white">{winProb}% <span className="text-[10px] text-zinc-500 font-light">PROB</span></div>
                  </div>
                  <div className="h-3 bg-zinc-900 rounded-full overflow-hidden flex">
                    <motion.div 
                      initial={{ width: '50%' }}
                      animate={{ width: `${winProb}%` }}
                      className="h-full bg-gradient-to-r from-pink-500 via-cyan-500 to-cyan-400 relative"
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-scan" style={{ width: '40px' } as any} />
                    </motion.div>
                  </div>
                  <div className="flex justify-between mt-2 text-[8px] font-mono uppercase tracking-[0.2em]">
                    <span className={winProb < 50 ? 'text-pink-500' : 'text-zinc-600'}>O FAVOR</span>
                    <span className="text-zinc-700">MID_POINT</span>
                    <span className={winProb > 50 ? 'text-cyan-500' : 'text-zinc-600'}>X FAVOR</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar flex-grow">
                  <AnimatePresence mode="popLayout">
                    {commentary.map((msg, i) => (
                      <motion.div
                        key={msg + (commentary.length - i)}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1 - i * 0.15, x: 0 }}
                        exit={{ opacity: 0 }}
                        className={`
                          p-4 rounded-xl text-[11px] leading-relaxed relative overflow-hidden group
                          ${i === 0 ? 'bg-cyan-500/10 border border-cyan-500/30 text-white' : 'bg-white/5 text-zinc-400 border border-white/5'}
                        `}
                      >
                        {i === 0 && <div className="absolute left-0 top-0 w-1 h-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]" />}
                        <div className="font-mono opacity-50 mb-1 flex justify-between">
                          <span>LOG_ENTRY_{commentary.length - i}</span>
                          {i === 0 && <span className="animate-pulse text-cyan-400 text-[9px]">ANALYZING...</span>}
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

      <footer className="mt-12 text-zinc-700 text-[10px] font-mono tracking-widest flex items-center gap-4">
        <span>ENCRYPTED_LINK_ESTABLISHED</span>
        <span className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
        <span>SECURE_SESSION</span>
      </footer>
    </div>
  );
}
