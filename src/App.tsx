/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RefreshCw, BrainCircuit, ChevronRight, MessageSquare, Info, Play, Lightbulb, X as CloseIcon, Undo2, Sun, Moon, ExternalLink, Skull } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Player, BoardState, Move, Difficulty, GameHistoryEntry } from './types';
import { createInitialState, makeMove, isValidMove } from './lib/gameEngine';
import { getBestMove, evaluateHeuristic } from './lib/aiEngine';

// --- Sub-components ---

const TechBackground = React.memo(({ isDark }: { isDark: boolean }) => {
  const circuitLines = useMemo(() => Array.from({ length: 15 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    width: i % 2 === 0 ? '1px' : `${Math.random() * 200 + 100}px`,
    height: i % 2 === 0 ? `${Math.random() * 200 + 100}px` : '1px',
    duration: `${Math.random() * 5 + 3}s`,
    delay: `${Math.random() * 5}s`,
    color: i % 3 === 0 ? (isDark ? 'rgba(34, 211, 238, 0.2)' : 'rgba(34, 211, 238, 0.4)') : (isDark ? 'rgba(244, 114, 182, 0.2)' : 'rgba(244, 114, 182, 0.4)')
  })), [isDark]);

  return (
    <div className={`fixed inset-0 z-[-2] overflow-hidden pointer-events-none transition-colors duration-700 ${isDark ? 'bg-[#050505]' : 'bg-slate-50'}`}>
      {/* Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.4]" 
        style={{ 
          backgroundImage: `radial-gradient(${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} 1px, transparent 1px)`,
          backgroundSize: '30px 30px'
        }} 
      />
      
      {/* Circuit lines inspired by image */}
      {circuitLines.map(line => (
        <motion.div
          key={line.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: parseFloat(line.duration), delay: parseFloat(line.delay), ease: "easeInOut" }}
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
      <div className={`absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] transition-opacity duration-1000 ${isDark ? 'bg-cyan-500/10 opacity-60' : 'bg-cyan-500/5 opacity-40'}`} />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] rounded-full blur-[120px] transition-opacity duration-1000 ${isDark ? 'bg-pink-500/10 opacity-60' : 'bg-pink-500/5 opacity-40'}`} />
      
      {/* Overall Blur for content visibility */}
      <div className="absolute inset-0 backdrop-blur-[1px]" />
    </div>
  );
});

const MultilingualUltimate = React.memo(({ isDark }: { isDark: boolean }) => {
  const languages = useMemo(() => [
    'ULTIMATE',      // English
    'ПРЕДЕЛЬНЫЙ',    // Russian
    '极致',          // Chinese
    'ULTIME',        // French
    '궁극',          // Korean
    'ÚLTIMO',        // Spanish
    '究極',          // Japanese
    'ULTIMATIV',     // German
    'परम',           // Hindi
    'ପରମ'            // Odia
  ], []);

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
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="electric-glow blackout-effect relative inline-block"
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
  isNextGrid: boolean;
  isValid: boolean;
  isHint?: boolean;
}

const Cell: React.FC<CellProps> = ({ value, onClick, isNextGrid, isValid, isHint, isDark }) => {
  return (
    <motion.div
      whileHover={isValid ? { backgroundColor: isDark ? 'rgba(34, 211, 238, 0.15)' : 'rgba(34, 211, 238, 0.1)' } : {}}
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
  hintIndex?: number | null;
}

const SmallGrid: React.FC<GridProps> = ({ board, onMove, isNextGrid, winner, dimmed, hintIndex, isDark }) => {
  return (
    <div className={`
      relative grid grid-cols-3 grid-rows-3 gap-1 p-1 transition-all duration-300 rounded-[12px]
      ${isNextGrid ? (isDark ? 'glass border-active animate-pulse-cyan ring-1 ring-cyan-500/30' : 'bg-cyan-50 border-2 border-cyan-400 animate-pulse-cyan shadow-lg') : (isDark ? 'glass border-white/10' : 'bg-slate-200/50 border border-slate-300')}
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
          isDark={isDark}
        />
      ))}
      
      <AnimatePresence>
        {winner && winner !== 'Draw' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`${isDark ? 'winning-overlay' : 'winning-overlay-light'} absolute inset-0 text-5xl z-10 ${winner === 'X' ? 'neon-cyan' : 'neon-pink'}`}
          >
            {winner}
          </motion.div>
        )}
        {winner === 'Draw' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`${isDark ? 'winning-overlay' : 'winning-overlay-light'} absolute inset-0 text-2xl text-zinc-500 z-10`}
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
  const [isDark, setIsDark] = useState(true);

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
        
        // Trigger win confetti
        if (nextState.winner === 'X') {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22d3ee', '#f472b6', '#ffffff']
          });
        }
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
      <div className={`min-h-screen ${isDark ? 'bg-[#050505] text-white' : 'bg-slate-50 text-slate-900'} font-sans p-4 pt-20 md:p-12 flex flex-col items-center justify-center text-center relative selection:bg-cyan-500/30 transition-colors duration-700`}>
        {/* Animated Background */}
        <TechBackground isDark={isDark} />
        
        {/* Top bar on Home Screen */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-4 z-[50]">
          <button 
            onClick={() => setIsDark(!isDark)}
            className={`p-3 rounded-full transition-all ${isDark ? 'bg-white/5 text-yellow-400 hover:bg-white/10' : 'bg-black/5 text-indigo-600 hover:bg-black/10'}`}
          >
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl glass p-5 sm:p-8 md:p-12 relative mx-auto overflow-hidden"
        >
          <div className="relative group mb-8">
            <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter italic leading-none">
              <span className="relative inline-block">
                <span className="absolute -inset-2 bg-cyan-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <MultilingualUltimate isDark={isDark} />
              </span>
              <br/>
              <span className={`${isDark ? 'text-zinc-600' : 'text-slate-400'} font-light text-2xl sm:text-4xl md:text-5xl block mt-2`}>TIC·TAC·TOE</span>
            </h1>
          </div>
          <p className={`${isDark ? 'text-zinc-400' : 'text-slate-500'} uppercase tracking-[0.2em] md:tracking-[0.4em] text-[8px] md:text-[10px] mb-8 md:mb-12 font-mono`}>Tactical Grid Engine v2.5.1</p>

          <div className="text-left space-y-4 md:space-y-6 mb-8 md:mb-12">
            <h2 className={`text-[10px] uppercase tracking-widest font-bold border-l-2 border-cyan-500 pl-4 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>How to Play</h2>
            <ul className={`space-y-3 md:space-y-4 text-xs md:text-sm font-light ${isDark ? 'text-zinc-300' : 'text-slate-600'}`}>
              <li className="flex gap-3 md:gap-4">
                <span className="text-cyan-500 font-mono">01.</span>
                <span>The board has <strong className={isDark ? 'text-white' : 'text-slate-900'}>9 small grids</strong> inside one big grid.</span>
              </li>
              <li className="flex gap-3 md:gap-4">
                <span className="text-cyan-500 font-mono">02.</span>
                <span>Where you play in a small grid <strong className={isDark ? 'text-white' : 'text-slate-900'}>forces</strong> where your opponent plays next.</span>
              </li>
              <li className="flex gap-3 md:gap-4">
                <span className="text-cyan-500 font-mono">03.</span>
                <span>Win a small grid by getting 3 in a row.</span>
              </li>
              <li className="flex gap-3 md:gap-4">
                <span className="text-cyan-500 font-mono">04.</span>
                <span>Win the <strong className={isDark ? 'text-white' : 'text-slate-900'}>whole game</strong> by winning 3 small grids.</span>
              </li>
            </ul>
          </div>

          {/* Tactical Configuration Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {/* Player Agent Name Input */}
            <div className="flex flex-col gap-2">
              <label className={`text-[9px] uppercase tracking-widest font-bold text-left ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                Agent Name
              </label>
              <div className="relative group">
                <input
                  type="text"
                  value={playerName}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setPlayerName(e.target.value.toUpperCase().slice(0, 15))}
                  placeholder="ENTER NAME"
                  className={`w-full border rounded-xl px-5 py-4 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all uppercase tracking-widest h-[60px] ${isDark ? 'bg-white/5 border-white/10 text-white focus:bg-white/10' : 'bg-slate-100 border-slate-200 text-slate-800 focus:bg-white shadow-inner'}`}
                />
              </div>
            </div>

            {/* AI Difficulty Selection */}
            <div className="flex flex-col gap-2">
              <label className={`text-[9px] uppercase tracking-widest font-bold text-left ml-1 ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                AI Sensitivity Level
              </label>
              <div className={`flex p-1.5 rounded-xl border h-[60px] ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                {(['Novice', 'Tactician', 'Grandmaster'] as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`flex-grow h-full rounded-lg text-[9px] md:text-[10px] uppercase font-black tracking-tighter md:tracking-widest transition-all ${difficulty === level ? 'bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.4)]' : (isDark ? 'text-zinc-500 hover:text-white hover:bg-white/5' : 'text-slate-400 hover:text-slate-900 hover:bg-white/50')}`}
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
                  className="flex-1 flex items-center justify-center gap-3 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-black px-4 sm:px-8 py-4 sm:py-5 rounded-xl text-xs sm:text-sm tracking-[0.1em] sm:tracking-[0.2em] hover:bg-cyan-500/20 transition-all active:scale-[0.98] group"
                >
                  RESUME MISSION
                </button>
              )}
              <button
                onClick={() => { setShowHome(false); resetGame(); }}
                className={`flex-1 flex items-center justify-center gap-3 ${history.length > 0 ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-white text-black hover:bg-cyan-400 shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-cyan-400/20'} font-black px-4 sm:px-8 py-4 sm:py-5 rounded-xl text-xs sm:text-sm tracking-[0.1em] sm:tracking-[0.2em] transition-all active:scale-[0.98] group`}
              >
                <Play size={18} fill="currentColor" className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
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
    <div className={`min-h-screen ${isDark ? 'bg-[#050505] text-white' : 'bg-slate-50 text-slate-900'} flex flex-col items-center p-4 md:p-8 transition-colors duration-700 relative`}>
      <TechBackground isDark={isDark} />
      
      {/* Navigation & Controls */}
      <nav className={`w-full max-w-6xl flex items-center justify-between mb-8 px-3 sm:px-6 py-3 sm:py-4 transition-all ${isDark ? 'glass border-white/5' : 'bg-white/90 backdrop-blur-md border border-slate-300 rounded-2xl shadow-sm'}`}>
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setShowHome(true)}
            className={`flex items-center gap-1.5 transition-colors group ${isDark ? 'text-zinc-500 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
          >
            <Info size={14} className="group-hover:text-cyan-500 transition-colors" />
            <span className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold">Rules</span>
          </button>
          <div className={`h-4 w-px ${isDark ? 'bg-white/10' : 'bg-black/10'}`} />
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] sm:text-[10px] font-mono text-cyan-600 font-bold tracking-wider">{difficulty.toUpperCase()}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-lg transition-all ${isDark ? 'bg-white/5 text-yellow-500 hover:bg-white/10' : 'bg-slate-200 text-indigo-600 hover:bg-slate-300 border border-slate-300'}`}
            title="Toggle Protocol"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <button 
            onClick={() => setShowLog(!showLog)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg border transition-all ${showLog ? (isDark ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-cyan-600 text-white border-cyan-700 shadow-md shadow-cyan-600/20') : (isDark ? 'bg-white/5 border-white/10 text-zinc-500 hover:text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50')}`}
          >
            <MessageSquare size={16} className="sm:w-[18px] sm:h-[18px]" />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden xs:inline sm:inline">Log</span>
          </button>
        </div>
      </nav>

      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 items-center lg:items-stretch justify-center relative">
        {/* Main Board Container */}
        <main className="flex-grow flex flex-col items-center justify-center order-1 lg:order-2">
          <div className="mb-6 text-center">
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-none"
            >
              <span className="italic block sm:inline"><MultilingualUltimate isDark={isDark} /></span>
              <span className={`${isDark ? 'text-zinc-600' : 'text-slate-400'} font-light text-xl sm:text-3xl md:text-4xl block sm:mt-0 sm:ml-4`}>TIC·TAC·TOE</span>
            </motion.h1>
            <p className={`text-[10px] uppercase tracking-[0.3em] mt-4 font-mono ${isDark ? 'text-zinc-400' : 'text-slate-400'}`}>Tactical Grid Engine v2.4.9</p>
          </div>

          <div className={`relative aspect-square w-full max-w-[540px] p-2 md:p-4 glass ${isDark ? 'border-white/20' : 'bg-white border-slate-300 shadow-xl shadow-slate-200/50'} flex flex-col items-center justify-center`}>
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
                    isDark={isDark}
                  />
                ))}
             </div>

             {/* Game Over Overlay */}
             <AnimatePresence>
                {gameState.winner && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 z-[100] flex flex-col items-center justify-center p-4 md:p-8 text-center overflow-hidden transition-all duration-1000 ${gameState.winner === 'O' ? 'bg-black/95 backdrop-blur-[20px]' : 'bg-black/40 backdrop-blur-md'}`}
                  >
                    <motion.div
                      initial={{ scale: 0.9, y: 30, opacity: 0 }}
                      animate={{ scale: 1, y: 0, opacity: 1 }}
                      className={`w-full max-w-sm md:max-w-md ${isDark ? 'glass' : 'bg-white'} p-6 md:p-12 flex flex-col items-center shadow-2xl relative border-none`}
                    >
                      {gameState.winner === 'O' ? (
                        <div className="flex flex-col items-center w-full">
                          <Skull className="text-red-600 mb-4 md:mb-8 drop-shadow-[0_0_20px_rgba(220,38,38,0.6)] animate-bounce w-12 h-12 md:w-16 md:h-16" />
                          <h2 className="text-2xl md:text-4xl font-black mb-2 md:mb-4 tracking-tighter text-red-600 italic uppercase">
                            SYSTEM OVERRIDE
                          </h2>
                          <p className="hidden sm:block text-red-900/60 font-mono text-[10px] md:text-xs mb-6 md:mb-10 tracking-widest leading-relaxed">
                            CRITICAL FAILURE. CONNECTION SEVERED.<br/>DATA PURGE IN PROGRESS...
                          </p>
                          <button
                            onClick={resetGame}
                            className="w-full sm:w-auto bg-red-600 text-white font-black px-6 md:px-10 py-3 md:py-4 rounded-xl text-xs md:text-sm tracking-widest hover:bg-red-700 transition-all active:scale-95 shadow-[0_0_30px_rgba(220,38,38,0.4)]"
                          >
                            RETRY CONNECTION
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center w-full">
                          <div className="relative mb-6 md:mb-8">
                            <Trophy className={`${gameState.winner === 'X' ? 'neon-cyan' : 'text-zinc-400'} w-12 h-12 md:w-16 md:h-16`} />
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                              className="absolute inset-0 border-2 border-dashed border-cyan-500/20 rounded-full scale-125 md:scale-150"
                            />
                          </div>
                          <h2 className={`text-2xl md:text-4xl font-black mb-2 md:mb-4 tracking-tighter ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {gameState.winner === 'Draw' ? 'NEUTRALIZED' : 'MISSION COMPLETE'}
                          </h2>
                          <p className={`hidden sm:block text-xs md:text-sm mb-6 md:mb-10 font-mono tracking-wide ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
                            {gameState.winner === 'X' ? 'Optimal tactical sequence accomplished.' : 'Strategic parity achieved in all sectors.'}
                          </p>
                          <button
                            onClick={resetGame}
                            className="w-full sm:w-auto bg-cyan-500 text-black font-black px-6 md:px-10 py-3 md:py-4 rounded-xl text-xs md:text-sm tracking-widest hover:bg-cyan-400 transition-all active:scale-95 shadow-[0_0_30px_rgba(34,211,238,0.3)]"
                          >
                            NEW DEPLOYMENT
                          </button>
                        </div>
                      )}
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
                ${gameState.currentPlayer === 'X' ? 'bg-cyan-500/10 border-cyan-500/30' : (isDark ? 'bg-zinc-900 border-zinc-800 opacity-40' : 'bg-slate-100 border-slate-300 opacity-50')}
              `}>
                <div className={`w-2 h-2 rounded-full ${gameState.currentPlayer === 'X' ? 'bg-cyan-500 animate-pulse' : (isDark ? 'bg-zinc-700' : 'bg-slate-300')}`} />
                <span className={`text-xs font-bold tracking-widest ${gameState.currentPlayer === 'X' ? 'text-cyan-600' : (isDark ? 'text-zinc-500' : 'text-slate-400')}`}>{playerName} [X]</span>
              </div>
              <div className="text-slate-400 font-mono text-xs">VS</div>
              <div className={`
                px-4 py-2 rounded-lg border flex items-center gap-3 transition-all duration-500
                ${gameState.currentPlayer === 'O' ? 'bg-pink-500/10 border-pink-500/30' : (isDark ? 'bg-zinc-900 border-zinc-800 opacity-40' : 'bg-slate-100 border-slate-300 opacity-50')}
              `}>
                <div className={`w-2 h-2 rounded-full ${gameState.currentPlayer === 'O' ? 'bg-pink-500 animate-pulse' : (isDark ? 'bg-zinc-700' : 'bg-slate-300')}`} />
                <span className={`text-xs font-bold tracking-widest ${gameState.currentPlayer === 'O' ? 'text-pink-600' : (isDark ? 'text-zinc-500' : 'text-slate-400')}`}>ENGINE [O]</span>
              </div>
            </div>

            <div className={`h-8 w-px ${isDark ? 'bg-white/10' : 'bg-slate-300'} hidden md:block`} />

            <div className="flex items-center gap-2">
              <button 
                onClick={getHint}
                disabled={!!gameState.winner || gameState.currentPlayer !== 'X'}
                className={`p-2 rounded-lg border transition-all ${!!gameState.winner || gameState.currentPlayer !== 'X' ? 'opacity-20 cursor-not-allowed border-zinc-800' : (isDark ? 'border-yellow-500/20 bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-500 shadow-sm' : 'border-yellow-500/40 bg-white hover:bg-yellow-50 text-yellow-600 shadow-sm')}`}
                title="Tactical Hint"
              >
                <Lightbulb size={18} />
              </button>
              <button
                onClick={handleUndo}
                disabled={history.length < 2 || !!gameState.winner || isAiThinking}
                className={`p-2 rounded-lg border transition-all ${history.length < 2 || !!gameState.winner || isAiThinking ? 'opacity-20 cursor-not-allowed border-zinc-800' : (isDark ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10' : 'bg-white border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100')}`}
                title="Undo Move"
              >
                <Undo2 size={18} />
              </button>
              <button
                onClick={resetGame}
                className={`p-2 rounded-lg border transition-all ${isDark ? 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10' : 'bg-white border-slate-300 text-slate-500 hover:text-slate-900 hover:bg-slate-100'}`}
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
              className="w-full lg:w-[540px] flex flex-col order-3 overflow-hidden shrink-0 mx-auto"
            >
              <div className={`h-full p-6 flex flex-col ${isDark ? 'glass' : 'bg-white border border-slate-300 rounded-2xl shadow-xl shadow-slate-200/50'}`}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex flex-col gap-1">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-600 font-black flex items-center gap-2">
                      <MessageSquare size={14} />
                      Tactical Analysis
                    </div>
                    <div className={`text-[9px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>SECTOR_ANALYSIS_V4</div>
                  </div>
                  <button onClick={() => setShowLog(false)} className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-600 hover:text-white' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'}`}>
                    <CloseIcon size={14} />
                  </button>
                </div>

                {/* Win Probability Display at Top */}
                <div className={`mb-8 p-4 rounded-xl border relative overflow-hidden ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex justify-between items-end mb-3">
                    <div className={`text-[10px] uppercase tracking-widest font-bold ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>Your Win Probability</div>
                    <div className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{winProb}% <span className="text-[10px] text-zinc-500 font-light">PROB</span></div>
                  </div>
                  <div className={`h-3 rounded-full overflow-hidden flex ${isDark ? 'bg-zinc-900' : 'bg-slate-200'}`}>
                    <motion.div 
                      initial={{ width: '50%' }}
                      animate={{ width: `${winProb}%` }}
                      className="h-full bg-gradient-to-r from-pink-500 via-cyan-500 to-cyan-400 relative"
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-scan" style={{ width: '40px' } as any} />
                    </motion.div>
                  </div>
                  <div className="flex justify-between mt-2 text-[8px] font-mono uppercase tracking-[0.2em]">
                    <span className={winProb < 50 ? 'text-pink-500' : (isDark ? 'text-zinc-600' : 'text-slate-300')}>O FAVOR</span>
                    <span className={isDark ? 'text-zinc-700' : 'text-slate-200'}>MID_POINT</span>
                    <span className={winProb > 50 ? 'text-cyan-600' : (isDark ? 'text-zinc-600' : 'text-slate-300')}>X FAVOR</span>
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
                          ${i === 0 ? (isDark ? 'bg-cyan-500/10 border border-cyan-500/30 text-white' : 'bg-cyan-50 border border-cyan-300 text-cyan-900 shadow-sm') : (isDark ? 'bg-white/5 text-zinc-400 border border-white/5' : 'bg-white text-slate-500 border border-slate-200')}
                        `}
                      >
                        {i === 0 && <div className="absolute left-0 top-0 w-1 h-full bg-cyan-500 shadow-[0_0_10px_#22d3ee]" />}
                        <div className="font-mono opacity-50 mb-1 flex justify-between">
                          <span>LOG_ENTRY_{commentary.length - i}</span>
                          {i === 0 && <span className="animate-pulse text-cyan-600 text-[9px] font-bold">ANALYZING...</span>}
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

      <footer className={`mt-12 text-[10px] font-mono tracking-widest flex items-center gap-4 transition-colors ${isDark ? 'text-zinc-700' : 'text-slate-400'}`}>
        <span>ENCRYPTED_LINK_ESTABLISHED</span>
        <span className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
        <span>SECURE_SESSION</span>
      </footer>
    </div>
  );
}
