export type GamePhase =
  | "START"
  | "LOADING"
  | "PLAYING"
  | "RESULT"
  | "GAME_OVER";

export interface Track {
  id: string;
  name: string;
  artist: string;
  previewUrl: string;
}

export interface Round {
  track: Track;
  /** Semitones applied to shift the clip away from original */
  appliedShift: number;
  /** Correct correction: -appliedShift to restore original pitch */
  targetCorrection: number;
  /** What the player entered on the slider */
  playerCorrection: number;
  /** 0–10 */
  score: number;
}

export interface GameState {
  phase: GamePhase;
  rounds: Round[];
  currentRound: number;
  tracks: Track[];
  /** Slider value during GUESSING phase */
  sliderValue: number;
  error: string | null;
}
