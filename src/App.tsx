/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RefreshCw, Cpu, BrainCircuit, Activity, ChevronRight, MessageSquare } from 'lucide-react';
import { Player, BoardState, Move, Difficulty, GameHistoryEntry } from './types';
import { createInitialState, makeMove, isValidMove } from './lib/gameEngine';
import { getBestMove } from './lib/aiEngine';

// --- Sub-components ---

interface CellProps {
  value: Player | null;
  onClick: () => void;
  isNextGrid: boolean;
  isValid: boolean;
}

const Cell: React.FC<CellProps> = ({ value, onClick, isNextGrid, isValid }) => {
  return (
    <motion.div
      whileHover={isValid ? { backgroundColor: 'rgba(34, 211, 238, 0.1)' } : {}}
      whileTap={isValid ? { scale: 0.95 } : {}}
      onClick={onClick}
      className={`
        relative h-full w-full flex items-center justify-center rounded-sm transition-colors cursor-pointer
        ${isValid ? 'bg-white/5 hover:bg-white/10' : 'bg-transparent cursor-not-allowed'}
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
}

const SmallGrid: React.FC<GridProps> = ({ board, onMove, isNextGrid, winner, dimmed }) => {
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

  const addCommentary = useCallback((msg: string) => {
    setCommentary(prev => [msg, ...prev].slice(0, 5));
  }, []);

  const handleMove = useCallback((gridIndex: number, cellIndex: number) => {
    if (!isValidMove(gameState, { gridIndex, cellIndex })) {
      // Shake animation effect could be triggered here if we had a ref
      return;
    }

    const nextState = makeMove(gameState, { gridIndex, cellIndex });
    setGameState(nextState);
    setHistory(prev => [{ move: { gridIndex, cellIndex }, player: gameState.currentPlayer, timestamp: Date.now() }, ...prev]);

    // Check for commentary events
    const playerMsg = gameState.currentPlayer === 'X' ? 'Pilot' : 'Engine';
    
    if (nextState.nextGridIndex === null && !nextState.winner) {
      addCommentary("Free Play unlocked! The tactical field is wide open.");
    } else if (nextState.gridWins[gridIndex] === gameState.currentPlayer) {
      const messages = [
        `${playerMsg} has consolidated a sector. Dominance growing.`,
        `A key fortification complete by ${playerMsg}.`,
        "Sector neutralized. Strategic advantage secured."
      ];
      addCommentary(messages[Math.floor(Math.random() * messages.length)]);
    } else if (cellIndex === 4) {
      addCommentary(`${playerMsg} seizes the center. A classic maneuver.`);
    } else if (history.length > 20) {
      addCommentary("The grid is becoming complex. Every move is critical.");
    }

    if (nextState.winner) {
      if (nextState.winner === 'Draw') {
        addCommentary("A tactical stalemate. No victors today.");
      } else {
        addCommentary(`${nextState.winner} has achieved global domination.`);
        setStats(s => ({ ...s, [nextState.winner as Player]: s[nextState.winner as Player] + 1 }));
      }
    }
  }, [gameState, addCommentary]);

  // AI Effect
  useEffect(() => {
    if (gameState.currentPlayer === 'O' && !gameState.winner) {
      setIsAiThinking(true);
      const timer = setTimeout(() => {
        const move = getBestMove(gameState, difficulty);
        handleMove(move.gridIndex, move.cellIndex);
        setIsAiThinking(false);
      }, 800); // Artificial delay for "thought"
      return () => clearTimeout(timer);
    }
  }, [gameState, difficulty, handleMove]);

  const resetGame = () => {
    setGameState(createInitialState());
    setHistory([]);
    addCommentary("Combat logs cleared. Initializing new grid...");
  };

  const toggleDifficulty = () => {
    const levels: Difficulty[] = ['Novice', 'Tactician', 'Grandmaster'];
    const next = levels[(levels.indexOf(difficulty) + 1) % levels.length];
    setDifficulty(next);
    addCommentary(`AI Reconfigured: ${next} active.`);
  };

  const getGridName = (idx: number) => {
    const rows = ['Top', 'Center', 'Bottom'];
    const cols = ['Left', 'Center', 'Right'];
    return `${rows[Math.floor(idx / 3)]}-${cols[idx % 3]}`;
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-4 md:p-8 flex flex-col items-center justify-center selection:bg-cyan-500/30">
      
      <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-6 items-stretch">
        
        {/* Left Sidebar: Session Analytics */}
        <aside className="w-full lg:w-64 flex flex-col gap-6 order-2 lg:order-1">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass p-6 flex flex-col h-auto"
          >
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-500 mb-4 font-semibold">
              <Activity size={12} className="text-cyan-500" />
              Session Analytics
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <div>
                  <div className="text-xs text-zinc-400">Player X</div>
                  <div className="text-2xl font-bold neon-cyan">{stats.X.toString().padStart(2, '0')}</div>
                </div>
                <div className="text-[10px] text-zinc-600 mb-1">WINS</div>
              </div>
              <div className="flex justify-between items-end border-b border-white/5 pb-2">
                <div>
                  <div className="text-xs text-zinc-400">AI Player O</div>
                  <div className="text-2xl font-bold neon-pink">{stats.O.toString().padStart(2, '0')}</div>
                </div>
                <div className="text-[10px] text-zinc-600 mb-1">WINS</div>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase mb-2">
                  <BrainCircuit size={12} />
                  AI Configuration
                </div>
                <div className="bg-white/5 rounded-md px-3 py-2 border border-white/10">
                  <div className="text-xs font-mono text-cyan-400">{difficulty === 'Grandmaster' ? 'Minimax (α-β)' : 'Heuristic Search'}</div>
                  <div className="text-[10px] text-zinc-500">Depth: {difficulty === 'Novice' ? 2 : difficulty === 'Tactician' ? 4 : 6} ({difficulty})</div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass p-6 flex-grow flex flex-col hidden lg:flex"
          >
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-4 font-semibold">Breadcrumb Trail</div>
            <div className="font-mono text-[11px] space-y-3 overflow-y-auto max-h-[300px] pr-2">
              {history.length > 0 ? history.slice(0, 8).map((entry, i) => (
                <div key={entry.timestamp} className={`flex gap-3 ${i === 0 ? 'text-white' : 'text-zinc-500'} items-center`}>
                  <span className="text-[9px] text-zinc-700">[{ (history.length - i).toString().padStart(2, '0')}]</span>
                  <span className={entry.player === 'X' ? 'text-cyan-400' : 'text-pink-400'}>{entry.player}</span>
                  <ChevronRight size={10} className="text-zinc-800" />
                  <span className="text-[10px]">{getGridName(entry.move.gridIndex)} &rsaquo; {getGridName(entry.move.cellIndex)}</span>
                </div>
              )) : (
                <div className="text-zinc-600 italic">No movements recorded.</div>
              )}
              {isAiThinking && (
                <motion.div 
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="mt-4 pt-4 border-t border-white/5 text-pink-500/80 font-bold"
                >
                  AI Processing Position...
                </motion.div>
              )}
            </div>
          </motion.div>
        </aside>

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
          <div className="mt-8 flex items-center gap-4">
            <div className={`
              px-4 py-2 rounded-lg border flex items-center gap-3 transition-all duration-500
              ${gameState.currentPlayer === 'X' ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-zinc-900 border-zinc-800 opacity-40'}
            `}>
              <div className={`w-2 h-2 rounded-full ${gameState.currentPlayer === 'X' ? 'bg-cyan-500 animate-pulse' : 'bg-zinc-700'}`} />
              <span className={`text-xs font-bold tracking-widest ${gameState.currentPlayer === 'X' ? 'text-cyan-400' : 'text-zinc-500'}`}>PILOT [X]</span>
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
        </main>

        {/* Right Sidebar: Controls & Commentary */}
        <aside className="w-full lg:w-64 flex flex-col gap-6 order-3">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass p-6 flex flex-col gap-4"
          >
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-semibold flex items-center gap-2">
              Match Controls
            </div>
            <button 
              onClick={resetGame}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-3 rounded-lg text-xs tracking-widest transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
            >
              RESTART SESSION
            </button>
            <button 
              onClick={toggleDifficulty}
              className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3 rounded-lg text-xs tracking-widest transition-all uppercase"
            >
              LVL: {difficulty}
            </button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass p-6 flex-grow flex flex-col"
          >
            <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-4 font-semibold flex items-center gap-2">
              <MessageSquare size={12} />
              Tactical Log
            </div>
            <div className="flex flex-col gap-3">
              <AnimatePresence mode="popLayout">
                {commentary.map((msg, i) => (
                  <motion.div
                    key={msg + i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1 - i * 0.2, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`
                      p-3 rounded text-[11px] leading-relaxed
                      ${i === 0 ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-100' : 'bg-white/5 text-zinc-500 border border-transparent'}
                    `}
                  >
                    &ldquo;{msg}&rdquo;
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        </aside>

      </div>

      <footer className="mt-12 text-zinc-700 text-[10px] font-mono tracking-widest flex items-center gap-4">
        <span>ENCRYPTED_LINK_ESTABLISHED</span>
        <span className="w-1 h-1 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]" />
        <span>SECURE_SESSION</span>
      </footer>
    </div>
  );
}
