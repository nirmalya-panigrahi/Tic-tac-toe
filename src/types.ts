export type Player = 'X' | 'O';
export type CellValue = Player | null;
export type GridWinner = Player | 'Draw' | null;

// A small 3x3 grid
export type SmallGridBoard = CellValue[]; // 9 elements

// The big 3x3 board
export interface BoardState {
  grids: SmallGridBoard[]; // 9 small grids
  gridWins: GridWinner[]; // Winners of each small grid (9 elements)
  nextGridIndex: number | null; // Index of the grid the next move must be in. null = any (Free Play)
  currentPlayer: Player;
  winner: Player | 'Draw' | null;
}

export type Difficulty = 'Novice' | 'Tactician' | 'Grandmaster';

export interface Move {
  gridIndex: number;
  cellIndex: number;
}

export interface GameHistoryEntry {
  move: Move;
  player: Player;
  timestamp: number;
  analysis?: string;
}
