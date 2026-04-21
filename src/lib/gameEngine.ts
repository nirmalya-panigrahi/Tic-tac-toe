import { Player, CellValue, GridWinner, BoardState, Move } from '../types';

export const WIN_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export function checkWin(board: (CellValue | GridWinner)[]): Player | 'Draw' | null {
  for (const [a, b, c] of WIN_COMBINATIONS) {
    if (board[a] && board[a] !== 'Draw' && board[a] === board[b] && board[a] === board[c]) {
      return board[a] as Player;
    }
  }
  
  if (board.every(cell => cell !== null)) {
    return 'Draw';
  }
  
  return null;
}

export function createInitialState(): BoardState {
  return {
    grids: Array(9).fill(null).map(() => Array(9).fill(null)),
    gridWins: Array(9).fill(null),
    nextGridIndex: null,
    currentPlayer: 'X',
    winner: null,
  };
}

export function isValidMove(state: BoardState, move: Move): boolean {
  if (state.winner) return false;
  
  const { gridIndex, cellIndex } = move;
  
  // Rule: Must play in the nextGridIndex if it's not null
  if (state.nextGridIndex !== null && gridIndex !== state.nextGridIndex) {
    return false;
  }
  
  // Rule: Cannot play in a grid that is already won or full
  if (state.gridWins[gridIndex] !== null) {
    return false;
  }
  
  // Rule: Cannot play in an occupied cell
  if (state.grids[gridIndex][cellIndex] !== null) {
    return false;
  }
  
  return true;
}

export function makeMove(state: BoardState, move: Move): BoardState {
  if (!isValidMove(state, move)) return state;

  const { gridIndex, cellIndex } = move;
  const newGrids = [...state.grids.map(g => [...g])];
  const newGridWins = [...state.gridWins];
  
  // Place symbol
  newGrids[gridIndex][cellIndex] = state.currentPlayer;
  
  // Check if small grid is won
  const gridResult = checkWin(newGrids[gridIndex]);
  if (gridResult && gridResult !== 'Draw') {
    newGridWins[gridIndex] = gridResult;
  } else if (gridResult === 'Draw') {
    newGridWins[gridIndex] = 'Draw';
  }
  
  // Check if global board is won
  const globalResult = checkWin(newGridWins);
  
  // Determine next grid
  // Rule: The cell index chosen points to the next grid index
  let nextGridIndex: number | null = cellIndex;
  
  // If the target grid is already won or full, it's Free Play
  if (newGridWins[nextGridIndex] !== null) {
    nextGridIndex = null;
  }
  
  return {
    grids: newGrids,
    gridWins: newGridWins,
    nextGridIndex,
    currentPlayer: state.currentPlayer === 'X' ? 'O' : 'X',
    winner: globalResult,
  };
}
