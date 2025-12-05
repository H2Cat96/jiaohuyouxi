export enum GameState {
  INTRO = 'INTRO',
  PLAYING = 'PLAYING',
  SUCCESS_ANIMATION = 'SUCCESS_ANIMATION',
  FINISHED = 'FINISHED'
}

export enum DeerState {
  IDLE = 'IDLE',
  GUITAR = 'GUITAR',
  ACCORDION = 'ACCORDION'
}

export interface LevelData {
  letter: string;
  word: string;
  hint: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  path: string; // SVG Path data
  start: Point; // 0-100 coordinate system
  end: Point;   // 0-100 coordinate system
  arrowRotation: number; // Rotation in degrees for the arrow at the end
}

export interface LetterPathConfig {
  strokes: Stroke[];
  viewBox: { width: number; height: number }; // usually 100x100 for normalization
}
