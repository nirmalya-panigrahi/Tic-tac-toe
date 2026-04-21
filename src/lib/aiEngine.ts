import { BoardState, Player, Move, Difficulty } from '../types';
import { makeMove, WIN_COMBINATIONS, checkWin } from './gameEngine';

// Weights for heuristics
const WEIGHT_GRID_WIN = 100;
const WEIGHT_TWO_IN_A_ROW = 10;
const WEIGHT_CENTER_CELL = 5;
const WEIGHT_CENTER_GRID = 20;

export function evaluateHeuristic(state: BoardState, aiPlayer: Player): number {
  if (state.winner === aiPlayer) return 10000;
  if (state.winner === (aiPlayer === 'X' ? 'O' : 'X')) return -10000;
  if (state.winner === 'Draw') return 0;

  let score = 0;
  const opponent = aiPlayer === 'X' ? 'O' : 'X';

  // 1. Grids Won
  state.gridWins.forEach((winner, idx) => {
    let multiplier = 1;
    if (idx === 4) multiplier = 2; // Center grid is more valuable

    if (winner === aiPlayer) score += WEIGHT_GRID_WIN * multiplier;
    if (winner === opponent) score -= WEIGHT_GRID_WIN * multiplier;
  });

  // 2. Potential Wins and Center Control
  state.grids.forEach((grid, gIdx) => {
    // Only evaluate if grid isn't won yet
    if (state.gridWins[gIdx] === null) {
      // Small grid center control
      if (grid[4] === aiPlayer) score += WEIGHT_CENTER_CELL;
      if (grid[4] === opponent) score -= WEIGHT_CENTER_CELL;

      // Two-in-a-row setups
      for (const [a, b, c] of WIN_COMBINATIONS) {
        const cells = [grid[a], grid[b], grid[c]];
        const aiCount = cells.filter(c => c === aiPlayer).length;
        const oppCount = cells.filter(c => c === opponent).length;
        const emptyCount = cells.filter(c => c === null).length;

        if (aiCount === 2 && emptyCount === 1) score += WEIGHT_TWO_IN_A_ROW;
        if (oppCount === 2 && emptyCount === 1) score -= WEIGHT_TWO_IN_A_ROW;
      }
    }
  });

  // 3. Multiplier for global center grid (index 4)
  if (state.gridWins[4] === aiPlayer) score += WEIGHT_CENTER_GRID;
  if (state.gridWins[4] === opponent) score -= WEIGHT_CENTER_GRID;

  return score;
}

function getAvailableMoves(state: BoardState): Move[] {
  const moves: Move[] = [];
  
  if (state.nextGridIndex !== null) {
    const gridIndex = state.nextGridIndex;
    state.grids[gridIndex].forEach((cell, cellIndex) => {
      if (cell === null) moves.push({ gridIndex, cellIndex });
    });
  } else {
    // Free Play: Check all open grids
    state.grids.forEach((grid, gridIndex) => {
      if (state.gridWins[gridIndex] === null) {
        grid.forEach((cell, cellIndex) => {
          if (cell === null) moves.push({ gridIndex, cellIndex });
        });
      }
    });
  }
  
  return moves;
}

function minimax(
  state: BoardState,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiPlayer: Player
): number {
  if (depth === 0 || state.winner) {
    return evaluateHeuristic(state, aiPlayer);
  }

  const moves = getAvailableMoves(state);
  
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const nextState = makeMove(state, move);
      const ev = minimax(nextState, depth - 1, alpha, beta, false, aiPlayer);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const nextState = makeMove(state, move);
      const ev = minimax(nextState, depth - 1, alpha, beta, true, aiPlayer);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getBestMove(state: BoardState, difficulty: Difficulty): Move {
  const moves = getAvailableMoves(state);
  const aiPlayer = state.currentPlayer;
  
  // Epsilon-greedy for lower difficulties
  const epsilon = difficulty === 'Novice' ? 0.3 : (difficulty === 'Tactician' ? 0.1 : 0);
  if (Math.random() < epsilon) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const depth = difficulty === 'Novice' ? 2 : (difficulty === 'Tactician' ? 4 : 6);
  
  let bestMove = moves[0];
  let bestValue = -Infinity;
  
  for (const move of moves) {
    const nextState = makeMove(state, move);
    const value = minimax(nextState, depth - 1, -Infinity, Infinity, false, aiPlayer);
    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
  }
  
  return bestMove;
}
