import type { Puzzle } from '../data/puzzles';
import { FAIL_SCORE, newRound, RoundState, score } from './logic';

/**
 * Free play: an endless run through a photo pool kept separate from the dailies, so it never
 * spoils one. Three lives; a solved photo earns 7 minus the level (6 points at level 1, 1 at
 * level 6); a missed photo costs a life. Photos get harder as the run goes on.
 */
export const LIVES = 3;

export type Run = {
  order: string[]; // puzzle ids for this run
  pos: number;
  lives: number;
  points: number;
  solved: number;
  round: RoundState;
};

export const byId = (pool: Puzzle[]): Record<string, Puzzle> => Object.fromEntries(pool.map((p) => [p.id, p]));

function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/**
 * Ramp: start with easy photos, mix in medium, then hard. Photos the player has seen
 * recently go to the back so a new run feels fresh.
 */
export function buildOrder(pool: Puzzle[], recent: string[] = []): string[] {
  const seen = new Set(recent);
  const tier = (d: Puzzle['difficulty']) => {
    const all = shuffle(pool.filter((p) => p.difficulty === d).map((p) => p.id));
    return [...all.filter((id) => !seen.has(id)), ...all.filter((id) => seen.has(id))];
  };
  const easy = tier('easy');
  const medium = tier('medium');
  const hard = tier('hard');
  const out: string[] = [];
  // First 5: easy. Next 10: medium with the odd easy one. Then medium and hard alternating.
  out.push(...easy.splice(0, 5));
  for (let i = 0; i < 10; i++) out.push(...(i % 3 === 2 ? easy.splice(0, 1) : medium.splice(0, 1)));
  while (easy.length || medium.length || hard.length) {
    out.push(...hard.splice(0, 1), ...medium.splice(0, 1), ...hard.splice(0, 1), ...easy.splice(0, 1));
  }
  return out;
}

export function newRun(pool: Puzzle[], recent: string[] = []): Run {
  return { order: buildOrder(pool, recent), pos: 0, lives: LIVES, points: 0, solved: 0, round: newRound(1) };
}

/** Photo at `offset` from the run's current one. Falls back to the first pool photo if the pool changed. */
export const puzzleAt = (run: Run, ids: Record<string, Puzzle>, pool: Puzzle[], offset = 0) =>
  ids[run.order[(run.pos + offset) % run.order.length]] ?? pool[(run.pos + offset) % pool.length];

/** Apply the finished round to the run's lives and points. */
export function settle(run: Run, round: RoundState): Run {
  const s = score(round);
  if (s == null) return { ...run, round };
  if (s === FAIL_SCORE) return { ...run, round, lives: run.lives - 1 };
  return { ...run, round, points: run.points + (7 - s), solved: run.solved + 1 };
}

export const isOver = (run: Run) => run.lives <= 0;

export function nextPhoto(run: Run): Run {
  return { ...run, pos: run.pos + 1, round: newRound(run.pos + 2) };
}
