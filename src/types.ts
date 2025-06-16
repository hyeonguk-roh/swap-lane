export type Lane = 0 | 1 | 2 | 3 | 4;

export interface EnemyCar {
  id: string;
  lane: Lane;
  top: number;
  switchingTo: Lane | null;
  switchTimer: number;
  isCrashed: boolean;
  isDrunk: boolean;
  isBus: boolean;
}

export interface GameState {
  isGameOver: boolean;
  miles: number;
} 