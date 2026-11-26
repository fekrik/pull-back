import AsyncStorage from '@react-native-async-storage/async-storage';
import { daysBetween, FAIL_SCORE, localDayKey, RoundState, score } from './logic';

const KEY = 'pullback:v1';

export type DayRecord = { puzzleNumber: number; score: number; round: RoundState };

export type SaveData = {
  /** Finished daily rounds, keyed by local day. One attempt per day. */
  history: Record<string, DayRecord>;
  /** Today's unfinished round, so closing the app does not reset it. */
  inProgress?: { day: string; round: RoundState };
  seenHowTo?: boolean;
  /** Puzzle ids finished in practice, so "Next puzzle" doesn't repeat them. */
  practicePlayed?: string[];
};

const EMPTY: SaveData = { history: {} };

export async function load(): Promise<SaveData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export async function save(data: SaveData) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage can be unavailable (private browsing). The game still works for this session.
  }
}

export function recordFinished(data: SaveData, day: string, round: RoundState): SaveData {
  const s = score(round);
  if (s == null || data.history[day]) return data;
  return {
    ...data,
    inProgress: undefined,
    history: { ...data.history, [day]: { puzzleNumber: round.puzzleNumber, score: s, round } },
  };
}

export type Stats = {
  played: number;
  winRate: number;
  distribution: number[]; // index 0..5 = solved at level 1..6, index 6 = fails
  currentStreak: number;
  bestStreak: number;
};

/** Streak = consecutive local days played, won or failed. */
export function computeStats(data: SaveData, today = localDayKey()): Stats {
  const days = Object.keys(data.history).sort();
  const distribution = [0, 0, 0, 0, 0, 0, 0];
  let wins = 0;
  for (const d of days) {
    const s = data.history[d].score;
    distribution[s - 1]++;
    if (s < FAIL_SCORE) wins++;
  }
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  // Current streak is alive if the last day played is today or yesterday.
  let current = 0;
  if (prev && daysBetween(prev, today) <= 1) current = run;
  return {
    played: days.length,
    winRate: days.length ? Math.round((wins / days.length) * 100) : 0,
    distribution,
    currentStreak: current,
    bestStreak: best,
  };
}
