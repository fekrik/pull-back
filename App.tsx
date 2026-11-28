import { StatusBar } from 'expo-status-bar';
import type React from 'react';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GuessInput } from './src/components/GuessInput';
import { ZoomImage } from './src/components/ZoomImage';
import { ANSWERS_BY_ID, Answer } from './src/data/answers';
import type { Puzzle } from './src/data/puzzles';
import { loadDaily, loadPool, prefetch } from './src/data/source';
import {
  byId,
  isOver,
  LIVES,
  newRun,
  nextPhoto,
  puzzleAt,
  Run,
  settle,
} from './src/game/freeplay';
import {
  applyGuess,
  currentLevel,
  DEFAULT_LEVEL_SHARES,
  FAIL_SCORE,
  HINT_AFTER_MISSES,
  localDayKey,
  MAX_GUESSES,
  misses,
  newRound,
  puzzleNumberFor,
  RoundState,
  score,
  shareText,
  SHARE_URL,
  untilNextPuzzle,
} from './src/game/logic';
import { computeStats, EMPTY_FREE, load, recordFinished, save, SaveData } from './src/game/storage';
import { C } from './src/theme';

/** Stand-in while the real puzzle loads; never shown (the body renders a spinner instead). */
const PLACEHOLDER: Puzzle = {
  id: 'loading',
  answerId: Object.keys(ANSWERS_BY_ID)[0],
  image: { uri: '' },
  focal: { x: 0.5, y: 0.5 },
  difficulty: 'easy',
  credit: { title: '', author: '', license: '' },
};

const haptic = (kind: 'tap' | 'wrong' | 'win' | 'lose') => {
  if (Platform.OS === 'web') return;
  if (kind === 'tap') Haptics.selectionAsync();
  else if (kind === 'wrong') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else if (kind === 'win') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

type Mode = 'daily' | 'free';

export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

function Game() {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 32, 440);
  const today = localDayKey();
  const todayNumber = puzzleNumberFor(today);

  const [data, setData] = useState<SaveData | null>(null);
  const [mode, setMode] = useState<Mode>('daily');
  const [daily, setDaily] = useState<RoundState>(newRound(todayNumber));
  const [run, setRun] = useState<Run | null>(null);
  const [sheet, setSheet] = useState<null | 'stats' | 'howto'>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Puzzles come from the server on native (see src/data/source.ts).
  const [dailyPuzzle, setDailyPuzzle] = useState<{ n: number; p: Puzzle } | null>(null);
  const [loadErr, setLoadErr] = useState(false);
  const [pool, setPool] = useState<Puzzle[] | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let live = true;
    setLoadErr(false);
    loadDaily(todayNumber)
      .then((p) => live && setDailyPuzzle({ n: todayNumber, p }))
      .catch(() => live && setLoadErr(true));
    loadPool((p) => live && setPool(p))
      .then((p) => live && setPool(p))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [todayNumber, reload]);
  const ids = useMemo(() => byId(pool ?? []), [pool]);

  useEffect(() => {
    load().then((d) => {
      setData(d);
      const done = d.history[today];
      if (done) setDaily(done.round);
      else if (d.inProgress?.day === today) setDaily(d.inProgress.round);
      if (d.freePlay?.current) setRun(d.freePlay.current);
      if (!d.seenHowTo) setSheet('howto');
    });
  }, [today]);

  const persist = useCallback((next: SaveData) => {
    setData(next);
    save(next);
  }, []);

  const free = data?.freePlay ?? EMPTY_FREE;

  const saveRun = (r: Run, base: SaveData | null = data) => {
    setRun(r);
    if (!base) return;
    const fp = base.freePlay ?? EMPTY_FREE;
    let nextFree = { ...fp, current: isOver(r) ? undefined : r };
    if (isOver(r)) {
      nextFree = {
        ...nextFree,
        runs: fp.runs + 1,
        best: Math.max(fp.best, r.points),
        bestSolved: Math.max(fp.bestSolved, r.solved),
        recent: [...r.order.slice(0, r.pos + 1), ...fp.recent].slice(0, 120),
      };
    }
    persist({ ...base, freePlay: nextFree });
  };

  const startFreePlay = () => {
    haptic('tap');
    if (!pool) {
      // No pool yet (offline on first launch): try again, and stay on the daily.
      setReload((r) => r + 1);
      flash("Couldn't load Free play. Check your connection and try again.");
      return;
    }
    setMode('free');
    setSheet(null);
    if (!run || isOver(run)) saveRun(newRun(pool, free.recent));
  };

  // Free play with no run yet (first render) falls back to the daily until the run exists.
  const inFree = mode === 'free' && run != null && pool != null;
  const loaded: Puzzle | null = inFree
    ? puzzleAt(run!, ids, pool!)
    : dailyPuzzle?.n === todayNumber
      ? dailyPuzzle.p
      : null;
  const ready = loaded != null;
  const puzzle: Puzzle = loaded ?? PLACEHOLDER;
  // Download the next free-play photo while this one is being played.
  useEffect(() => {
    if (inFree) prefetch(puzzleAt(run!, ids, pool!, 1));
  }, [inFree, run?.pos, ids]);
  const round = inFree ? run!.round : daily;
  const level = currentLevel(round);
  const answer = ANSWERS_BY_ID[puzzle.answerId];
  const shares = puzzle.levels ?? DEFAULT_LEVEL_SHARES;

  const onGuess = (g: Answer | 'skip') => {
    if (!ready) return;
    const next = applyGuess(round, puzzle, g === 'skip' ? 'skip' : { answerId: g.id });
    if (next.status === 'won') haptic('win');
    else if (next.status === 'lost') haptic('lose');
    else haptic('wrong');

    if (inFree) {
      saveRun(next.status === 'playing' ? { ...run!, round: next } : settle(run!, next));
      return;
    }
    setDaily(next);
    if (!data) return;
    if (next.status === 'playing') persist({ ...data, inProgress: { day: today, round: next } });
    else persist(recordFinished(data, today, next));
  };

  const doShare = async (text: string) => {
    haptic('tap');
    try {
      if (Platform.OS === 'web') {
        const nav: any = typeof navigator !== 'undefined' ? navigator : null;
        try {
          if (nav?.share) {
            await nav.share({ text });
            return;
          }
        } catch (e: any) {
          if (e?.name === 'AbortError') return;
        }
        try {
          await nav.clipboard.writeText(text);
          flash('Result copied');
        } catch {
          flash('Select the result above to copy it');
        }
        return;
      }
      await Share.share({ message: text });
    } catch {
      flash('Could not share. Long-press the result to copy.');
    }
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const guessed = round.guesses.flatMap((g) => (g.kind === 'skip' ? [] : [g.answerId]));
  const showHint = round.status === 'playing' && misses(round) >= HINT_AFTER_MISSES;
  const finished = round.status !== 'playing';
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  // When a round ends, the result goes under the photo. Shrink the photo so the photo and
  // the whole result fit on one screen, instead of scrolling the photo out of view.
  const [viewH, setViewH] = useState(0);
  const [resultH, setResultH] = useState(0);
  const photoSize =
    finished && viewH && resultH ? Math.round(Math.max(150, Math.min(size, viewH - resultH - 64))) : size;
  useEffect(() => {
    if (!finished) {
      setResultH(0);
      return;
    }
    Keyboard.dismiss();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [finished, puzzle.id]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => setSheet('howto')} hitSlop={10}>
            <Text style={styles.headerBtn}>?</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.title}>Pull Back</Text>
            <Text style={styles.subtitle}>
              {inFree ? (
                <>
                  <Text style={{ color: C.wrong }}>{'♥'.repeat(Math.max(run!.lives, 0))}</Text>
                  <Text style={{ color: C.unused }}>{'♥'.repeat(LIVES - Math.max(run!.lives, 0))}</Text>
                  {`  ${run!.points} pts · photo ${run!.pos + 1}`}
                </>
              ) : (
                `Daily #${todayNumber}`
              )}
            </Text>
          </View>
          <Pressable onPress={() => setSheet('stats')} hitSlop={10}>
            <Text style={styles.headerBtn}>▤</Text>
          </Pressable>
        </View>

        {(
          <View style={styles.tabs}>
            {(['daily', 'free'] as const).map((m) => {
              const active = (m === 'free') === inFree;
              return (
                <Pressable
                  key={m}
                  onPress={() => (m === 'free' ? startFreePlay() : setMode('daily'))}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>
                    {m === 'daily' ? 'Daily' : 'Free play'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <ScrollView
          ref={scrollRef}
          onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!ready && (
            <View style={[styles.loading, { width: size, height: size }]}>
              {loadErr && !inFree ? (
                <>
                  <Text style={styles.loadingText}>Couldn't load today's photo.{'\n'}Check your connection.</Text>
                  <Pressable onPress={() => setReload((r) => r + 1)} style={[styles.secondary, { paddingHorizontal: 28 }]}>
                    <Text style={styles.secondaryText}>Try again</Text>
                  </Pressable>
                </>
              ) : (
                <ActivityIndicator color={C.dim} />
              )}
            </View>
          )}
          {ready && (
          <>
          <ZoomImage
            key={inFree ? `free-${run!.pos}-${puzzle.id}` : `daily-${puzzle.id}`}
            source={puzzle.image}
            size={photoSize}
            focal={puzzle.focal}
            shares={shares}
            level={level}
          />

          <LevelDots round={round} />

          {showHint && (
            <Text style={styles.hint}>
              Hint: it belongs in <Text style={{ color: C.accent }}>{answer.category}</Text>
            </Text>
          )}

          {!finished && (
            <Text style={styles.prompt}>
              Level {level} of {MAX_GUESSES} · {Math.round(shares[level - 1] * 100)}% of the photo
            </Text>
          )}

          {!finished && <GuessList round={round} />}

          <View
            style={styles.resultWrap}
            onLayout={(e) => finished && setResultH(e.nativeEvent.layout.height)}
          >
          {finished && !inFree && (
            <DailyResult
              round={round}
              answer={answer}
              credit={puzzle.credit}
              onShare={() => doShare(shareText(round))}
              onFreePlay={startFreePlay}
            />
          )}
          {finished && inFree && (
            <FreeResult
              run={run!}
              best={free.best}
              answer={answer}
              credit={puzzle.credit}
              onNext={() => {
                haptic('tap');
                saveRun(nextPhoto(run!));
              }}
              onNewRun={() => {
                haptic('tap');
                saveRun(newRun(pool!, free.recent));
              }}
              onShare={() =>
                doShare(
                  `Pull Back free play: ${run!.points} points, ${run!.solved} photo${run!.solved === 1 ? '' : 's'} solved\n${SHARE_URL}`,
                )
              }
            />
          )}
          </View>
          </>
          )}
        </ScrollView>
        {!finished && ready && (
          <View style={styles.bottomBar}>
            <View style={{ width: size }}>
              <GuessInput exclude={guessed} onGuess={onGuess} onSkip={() => onGuess('skip')} />
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {toast && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      <Sheet
        visible={sheet === 'howto'}
        onClose={() => {
          setSheet(null);
          if (data && !data.seenHowTo) persist({ ...data, seenHowTo: true });
        }}
      >
        <HowTo />
      </Sheet>
      <Sheet visible={sheet === 'stats'} onClose={() => setSheet(null)}>
        {data && <StatsView data={data} today={today} />}
        {(
          <View style={{ marginTop: 18 }}>
            <Text style={styles.distTitle}>Free play</Text>
            <View style={styles.statRow}>
              <Stat n={free.best} label="Best run" />
              <Stat n={free.bestSolved} label="Most photos" />
              <Stat n={free.runs} label="Runs" />
            </View>
          </View>
        )}
      </Sheet>
    </SafeAreaView>
  );
}

function LevelDots({ round }: { round: RoundState }) {
  return (
    <View style={styles.dots}>
      {Array.from({ length: MAX_GUESSES }, (_, i) => {
        const g = round.guesses[i];
        const active = round.status === 'playing' && i === round.guesses.length;
        const bg = !g ? C.unused : g.kind === 'right' ? C.right : C.wrong;
        return <View key={i} style={[styles.dot, { backgroundColor: bg }, active && styles.dotActive]} />;
      })}
    </View>
  );
}

function GuessList({ round }: { round: RoundState }) {
  const wrong = round.guesses.filter((g) => g.kind !== 'right');
  if (!wrong.length) return null;
  return (
    <View style={styles.guesses}>
      {wrong.map((g, i) => (
        <Text key={i} style={styles.guessItem}>
          <Text style={{ color: C.wrong }}>✕ </Text>
          {g.kind === 'skip' ? 'Skipped' : ANSWERS_BY_ID[g.answerId]?.name}
        </Text>
      ))}
    </View>
  );
}

const article = (name: string) => (/^[aeiou]/i.test(name) ? 'an' : 'a');

function Credit({ credit }: { credit: Puzzle['credit'] }) {
  // CC BY / BY-SA ask for title, author, license, a link to the source and a note of changes.
  const text = `Photo: ${credit.title} by ${credit.author}, ${credit.license}, cropped`;
  if (!credit.url) return <Text style={styles.credit}>{text}</Text>;
  return (
    <Pressable onPress={() => Linking.openURL(credit.url!).catch(() => {})} hitSlop={6}>
      <Text style={styles.credit}>
        {text} <Text style={{ textDecorationLine: 'underline' }}>Source</Text>
      </Text>
    </Pressable>
  );
}

function DailyResult({
  round,
  answer,
  credit,
  onShare,
  onFreePlay,
}: {
  round: RoundState;
  answer: Answer;
  credit: Puzzle['credit'];
  onShare: () => void;
  onFreePlay?: () => void;
}) {
  const s = score(round)!;
  const [clock, setClock] = useState(untilNextPuzzle());
  useEffect(() => {
    const t = setInterval(() => setClock(untilNextPuzzle()), 1000);
    return () => clearInterval(t);
  }, []);
  const won = s !== FAIL_SCORE;
  const headline = !won
    ? 'Not this time'
    : s === 1
      ? 'Unreal. Level 1.'
      : s <= 3
        ? `Sharp eye. Level ${s}.`
        : `Got it at level ${s}.`;

  return (
    <View style={styles.result}>
      <Text style={styles.resultHead}>{headline}</Text>
      <Text style={styles.resultAnswer}>
        It was {article(answer.name)} <Text style={{ color: C.accent }}>{answer.name}</Text>
      </Text>
      <Text selectable style={styles.squares}>
        {shareTextSquares(round)}
      </Text>
      <Pressable onPress={onShare} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
        <Text style={styles.primaryText}>Share result</Text>
      </Pressable>
      <Text style={styles.next}>Next daily photo in {clock}</Text>
      {onFreePlay && (
        <Pressable
          onPress={onFreePlay}
          style={({ pressed }) => [styles.secondary, styles.stretch, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.secondaryText}>Keep playing in Free play</Text>
        </Pressable>
      )}
      <Credit credit={credit} />
    </View>
  );
}

function FreeResult({
  run,
  best,
  answer,
  credit,
  onNext,
  onNewRun,
  onShare,
}: {
  run: Run;
  best: number;
  answer: Answer;
  credit: Puzzle['credit'];
  onNext: () => void;
  onNewRun: () => void;
  onShare: () => void;
}) {
  const s = score(run.round)!;
  const won = s !== FAIL_SCORE;
  const over = isOver(run);
  const newBest = over && run.points > 0 && run.points >= best;
  return (
    <View style={styles.result}>
      <Text style={styles.resultHead}>
        {won ? `+${7 - s} point${7 - s === 1 ? '' : 's'}` : over ? 'Run over' : 'Lost a life'}
      </Text>
      <Text style={styles.resultAnswer}>
        It was {article(answer.name)} <Text style={{ color: C.accent }}>{answer.name}</Text>
      </Text>
      {over ? (
        <>
          <Text style={styles.runSummary}>
            {run.points} points · {run.solved} photo{run.solved === 1 ? '' : 's'} solved
          </Text>
          <Text style={styles.next}>{newBest ? 'New best run!' : `Best run: ${best} points`}</Text>
          <Pressable onPress={onNewRun} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
            <Text style={styles.primaryText}>Start a new run</Text>
          </Pressable>
          <Pressable onPress={onShare}>
            <Text style={styles.link}>Share score</Text>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={onNext} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
          <Text style={styles.primaryText}>Next photo</Text>
        </Pressable>
      )}
      <Credit credit={credit} />
    </View>
  );
}

const shareTextSquares = (round: RoundState) => shareText(round).split('\n').slice(0, 2).join('\n');

function StatsView({ data, today }: { data: SaveData; today: string }) {
  const st = useMemo(() => computeStats(data, today), [data, today]);
  const max = Math.max(1, ...st.distribution);
  return (
    <View>
      <Text style={styles.sheetTitle}>Your stats</Text>
      <View style={styles.statRow}>
        <Stat n={st.played} label="Played" />
        <Stat n={`${st.winRate}%`} label="Solved" />
        <Stat n={st.currentStreak} label="Streak" />
        <Stat n={st.bestStreak} label="Best" />
      </View>
      <Text style={styles.distTitle}>Solved at level</Text>
      {st.distribution.map((n, i) => (
        <View key={i} style={styles.distRow}>
          <Text style={styles.distLabel}>{i === 6 ? 'X' : i + 1}</Text>
          <View style={[styles.distBar, { flex: Math.max(n / max, 0.04) }]}>
            <Text style={styles.distN}>{n}</Text>
          </View>
          <View style={{ flex: 1 - Math.max(n / max, 0.04) }} />
        </View>
      ))}
    </View>
  );
}

const Stat = ({ n, label }: { n: number | string; label: string }) => (
  <View style={styles.stat}>
    <Text style={styles.statN}>{n}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

function HowTo() {
  return (
    <View>
      <Text style={styles.sheetTitle}>How to play</Text>
      <Text style={styles.sheetBody}>One close-up photo a day. Name the object in six guesses.</Text>
      <Text style={styles.sheetBody}>Each miss pulls the camera back and shows more of the photo.</Text>
      <Text style={styles.sheetBody}>Pick your guess from the list. Skipping counts as a miss.</Text>
      <Text style={styles.sheetBody}>After three misses you get the category as a hint.</Text>
      <Text style={styles.sheetBody}>Your score is the level you solved it at. Lower is better.</Text>
      <Text style={styles.sheetBody}>A new daily photo arrives at midnight.</Text>
      <Text style={styles.sheetBody}>
        Want more? Free play is endless: three lives, points for every photo you name, and it gets
        harder as you go.
      </Text>
      <Text style={[styles.sheetBody, { color: C.faint, fontSize: 13 }]}>
        Photos come from Wikimedia Commons and are used under their Creative Commons or public domain
        licenses. Each one is cropped, and its photographer and license are credited under the photo once
        you finish it. Tap the credit to see the original.
      </Text>
      <Text style={[styles.sheetBody, { fontSize: 13 }]}>
        <Text style={styles.link} onPress={() => Linking.openURL('https://pullback.barqlab.app/support')}>
          Support
        </Text>
        <Text style={{ color: C.faint }}>{'   ·   '}</Text>
        <Text style={styles.link} onPress={() => Linking.openURL('https://pullback.barqlab.app/privacy')}>
          Privacy policy
        </Text>
      </Text>
    </View>
  );
}

function Sheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <ScrollView>{children}</ScrollView>
          <Pressable style={styles.primary} onPress={onClose}>
            <Text style={styles.primaryText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerBtn: { color: C.dim, fontSize: 22, width: 28, textAlign: 'center' },
  title: { color: C.text, fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { color: C.dim, fontSize: 13, marginTop: 2 },
  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  tab: { paddingVertical: 7, paddingHorizontal: 18, borderRadius: 9 },
  tabActive: { backgroundColor: C.raised },
  tabText: { color: C.dim, fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: C.text },
  runSummary: { color: C.text, fontSize: 18, fontWeight: '700', marginTop: 14, fontVariant: ['tabular-nums'] },
  body: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 24 },
  bottomBar: { alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, zIndex: 10 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 16 },
  dot: { width: 34, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: C.accent },
  hint: { color: C.text, fontSize: 15, marginTop: 14 },
  prompt: { color: C.dim, fontSize: 14, marginTop: 12 },
  guesses: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 12, maxWidth: 440 },
  guessItem: {
    color: C.dim,
    fontSize: 14,
    backgroundColor: C.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  loading: { alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: C.card, gap: 6 },
  loadingText: { color: C.dim, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  resultWrap: { width: '100%', alignItems: 'center' },
  result: { alignItems: 'center', marginTop: 14, width: '100%', maxWidth: 440 },
  resultHead: { color: C.text, fontSize: 26, fontWeight: '800' },
  resultAnswer: { color: C.dim, fontSize: 18, marginTop: 6 },
  squares: { color: C.text, fontSize: 18, textAlign: 'center', marginTop: 14, lineHeight: 28 },
  primary: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 16,
  },
  primaryText: { color: '#1a1408', fontSize: 17, fontWeight: '800' },
  secondary: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 16,
  },
  stretch: { alignSelf: 'stretch' },
  secondaryText: { color: C.text, fontSize: 16, fontWeight: '600' },
  next: { color: C.dim, fontSize: 15, marginTop: 14, fontVariant: ['tabular-nums'] },
  link: { color: C.accent, fontSize: 15, marginTop: 12 },
  credit: { color: C.faint, fontSize: 12, marginTop: 18, textAlign: 'center' },
  toast: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
    backgroundColor: C.text,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    maxWidth: '90%',
  },
  toastText: { color: C.bg, fontSize: 15, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 16 },
  sheet: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 22,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  sheetTitle: { color: C.text, fontSize: 22, fontWeight: '800', marginBottom: 12 },
  sheetBody: { color: C.dim, fontSize: 16, lineHeight: 23, marginBottom: 8 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  stat: { alignItems: 'center', flex: 1 },
  statN: { color: C.text, fontSize: 28, fontWeight: '800' },
  statLabel: { color: C.dim, fontSize: 12, marginTop: 2 },
  distTitle: { color: C.text, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  distLabel: { color: C.dim, width: 18, fontSize: 14 },
  distBar: { backgroundColor: C.raised, borderRadius: 5, paddingVertical: 3, paddingHorizontal: 6, alignItems: 'flex-end' },
  distN: { color: C.text, fontSize: 12, fontWeight: '700' },
});
