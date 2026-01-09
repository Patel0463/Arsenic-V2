
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  EXPLODING = 'EXPLODING',
  GAME_OVER = 'GAME_OVER'
}

export type EnvironmentMode = 'DAY' | 'NIGHT';

export interface Plane {
  x: number;
  y: number;
  velocity: number;
  width: number;
  height: number;
  rotation: number;
  isDamaged: boolean;
  strikes: number;
}

export interface Tower {
  x: number;
  topHeight: number;
  width: number;
  passed: boolean;
}

export interface Challenge {
  number: number;
  timeLeft: number;
  active: boolean;
  x: number;
  y: number;
  radius: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size?: number;
}
