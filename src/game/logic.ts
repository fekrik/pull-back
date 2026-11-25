import { PUZZLES, Puzzle } from '../data/puzzles';

export const MAX_GUESSES = 6;
export const FAIL_SCORE = 7;
export const HINT_AFTER_MISSES = 3;

/** Share of the photo visible at each level (spec starting values, tune in testing). */
export const DEFAULT_LEVEL_SHARES = [0.04, 0.08, 0.15, 0.3, 0.55, 1];

/** Puzzle #1 is on this local date. */
export const LAUNCH_DATE = { y: 2026, m: 11, d: 25 };

export const SHARE_URL = 'https://pullback.barqlab.app';

export type Guess = { kind: 'wrong'; answerId: string } | { kind: 'skip' } | { kind: 'right'; answerId: string };

export type RoundState = {
  puzzleNumber: number;
  guesses: Guess[];
  status: 'playing' | 'won' | 'lost';
};

/** Local calendar day as yyyy-mm-dd. The puzzle changes at the player's local midnight. */
export function localDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayIndex(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

export function daysBetween(a: string, b: string) {
  return dayIndex(b) - dayIndex(a);
}

const LAUNCH_KEY = `${LAUNCH_DATE.y}-${String(LAUNCH_DATE.m).padStart(2, '0')}-${String(LAUNCH_DATE.d).padStart(2, '0')}`;

export function puzzleNumberFor(dayKey: string) {
  return Math.max(1, daysBetween(LAUNCH_KEY, dayKey) + 1);
}

/**
 * Prototype only: puzzles are bundled and cycle. The real app downloads a few days ahead
 * from the server so future answers are not in the binary.
 */
export function puzzleFor(number: number): Puzzle {
  return PUZZLES[(number - 1) % PUZZLES.length];
}

export function newRound(puzzleNumber: number): RoundState {
  return { puzzleNumber, guesses: [], status: 'playing' };
}

export function misses(round: RoundState) {
  return round.guesses.filter((g) => g.kind !== 'right').length;
}

/** Level currently shown, 1 to 6. After the round ends the full photo is shown. */
export function currentLevel(round: RoundState) {
  if (round.status !== 'playing') return MAX_GUESSES;
  return Math.min(MAX_GUESSES, misses(round) + 1);
}

export function applyGuess(round: RoundState, puzzle: Puzzle, guess: { answerId: string } | 'skip'): RoundState {
  if (round.status !== 'playing') return round;
  let g: Guess;
  if (guess === 'skip') g = { kind: 'skip' };
  else if (guess.answerId === puzzle.answerId) g = { kind: 'right', answerId: guess.answerId };
  else g = { kind: 'wrong', answerId: guess.answerId };
  const guesses = [...round.guesses, g];
  let status: RoundState['status'] = 'playing';
  if (g.kind === 'right') status = 'won';
  else if (guesses.length >= MAX_GUESSES) status = 'lost';
  return { ...round, guesses, status };
}

/** Score is the level solved at (1-6). A fail counts as 7. */
export function score(round: RoundState) {
  if (round.status === 'won') return round.guesses.length;
  if (round.status === 'lost') return FAIL_SCORE;
  return null;
}

export function squares(round: RoundState) {
  const out: string[] = [];
  for (let i = 0; i < MAX_GUESSES; i++) {
    const g = round.guesses[i];
    out.push(!g ? '⬜' : g.kind === 'right' ? '🟩' : '🟥');
  }
  return out.join('');
}

export function shareText(round: RoundState) {
  const s = score(round);
  const label = s === FAIL_SCORE ? 'X/6' : `${s}/6`;
  return `Pull Back #${round.puzzleNumber} ${label}\n${squares(round)}\n${SHARE_URL}`;
}

/** Time until the next local midnight, as h:mm:ss. */
export function untilNextPuzzle(now = new Date()) {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const ms = next.getTime() - now.getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
