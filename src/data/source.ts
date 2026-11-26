import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import type { Puzzle } from './puzzles';

/**
 * Native builds load puzzles from the Pull Back server instead of bundling them, so the app
 * stays small, new dailies need no app update, and future answers are not in the binary.
 * The server only hands out a daily once it is that day somewhere in the world.
 * Web builds use source.web.ts (bundled data) instead.
 */
export const SERVER = process.env.EXPO_PUBLIC_PULLBACK_SERVER ?? 'https://pullback.barqlab.app';

type RemotePuzzle = Omit<Puzzle, 'image'> & { image: string };

const toPuzzle = (p: RemotePuzzle): Puzzle => ({ ...p, image: { uri: `${SERVER}/${p.image}` } });

async function getJSON<T>(path: string, timeoutMs = 10000): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(`${SERVER}${path}`, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}

async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

const cacheSet = (key: string, v: unknown) => AsyncStorage.setItem(key, JSON.stringify(v)).catch(() => {});

/** Daily puzzle #n: from the cache if we already have it, otherwise from the server. */
export async function loadDaily(n: number): Promise<Puzzle> {
  const key = `pullback:daily:${n}`;
  const cached = await cacheGet<RemotePuzzle>(key);
  if (cached) return toPuzzle(cached);
  const p = await getJSON<RemotePuzzle>(`/v1/daily/${n}`);
  cacheSet(key, p);
  return toPuzzle(p);
}

type Pool = { version: string; photos: RemotePuzzle[] };
const POOL_KEY = 'pullback:pool';

/**
 * Free play pool. Returns the cached pool straight away when there is one (and refreshes it
 * in the background for next time); otherwise waits for the server.
 */
export async function loadPool(onUpdate?: (p: Puzzle[]) => void): Promise<Puzzle[]> {
  const cached = await cacheGet<Pool>(POOL_KEY);
  const fresh = getJSON<Pool>('/v1/freeplay').then((p) => {
    cacheSet(POOL_KEY, p);
    if (cached && p.version !== cached.version) onUpdate?.(p.photos.map(toPuzzle));
    return p;
  });
  if (cached) {
    fresh.catch(() => {});
    return cached.photos.map(toPuzzle);
  }
  return (await fresh).photos.map(toPuzzle);
}

/** Start downloading a photo before it is needed. */
export function prefetch(p: Puzzle | undefined) {
  const uri = p && typeof p.image === 'object' && 'uri' in (p.image as any) ? (p.image as any).uri : null;
  if (uri) Image.prefetch(uri).catch(() => {});
}
