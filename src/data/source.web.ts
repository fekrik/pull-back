import { FREEPLAY } from './freeplay';
import { PUZZLES, type Puzzle } from './puzzles';

/** Web builds (the playable preview) bundle their photos; native builds use the server. */
export const SERVER = 'https://pullback.barqlab.app';

export async function loadDaily(n: number): Promise<Puzzle> {
  return PUZZLES[(n - 1) % PUZZLES.length];
}

export async function loadPool(_onUpdate?: (p: Puzzle[]) => void): Promise<Puzzle[]> {
  return FREEPLAY;
}

export function prefetch(_p: Puzzle | undefined) {}
