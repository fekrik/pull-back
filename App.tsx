import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { PUZZLES } from './src/data/puzzles';
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
  puzzleFor,
  puzzleNumberFor,
  RoundState,
  score,
  shareText,
  untilNextPuzzle,
} from './src/game/logic';
import { computeStats, load, recordFinished, save, SaveData } from './src/game/storage';
import { C } from './src/theme';

const haptic = (kind: 'tap' | 'wrong' | 'win' | 'lose') => {
  if (Platform.OS === 'web') return;
  if (kind === 'tap') Haptics.selectionAsync();
  else if (kind === 'wrong') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  else if (kind === 'win') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  else Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
};

type Mode = { kind: 'daily' } | { kind: 'practice'; index: number };

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
  const [mode, setMode] = useState<Mode>({ kind: 'daily' });
  const [practice, setPractice] = useState<RoundState | null>(null);
  const [daily, setDaily] = useState<RoundState>(newRound(todayNumber));
  const [sheet, setSheet] = useState<null | 'stats' | 'howto' | 'practice'>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    load().then((d) => {
      setData(d);
      const done = d.history[today];
      if (done) setDaily(done.round);
      else if (d.inProgress?.day === today) setDaily(d.inProgress.round);
      if (!d.seenHowTo) setSheet('howto');
    });
  }, [today]);

  const persist = useCallback((next: SaveData) => {
    setData(next);
    save(next);
  }, []);

  const puzzle = mode.kind === 'daily' ? puzzleFor(todayNumber) : PUZZLES[mode.index];
  const round = mode.kind === 'daily' ? daily : practice!;
  const level = currentLevel(round);
  const answer = ANSWERS_BY_ID[puzzle.answerId];
  const shares = puzzle.levels ?? DEFAULT_LEVEL_SHARES;

  const onGuess = (g: Answer | 'skip') => {
    const next = applyGuess(round, puzzle, g === 'skip' ? 'skip' : { answerId: g.id });
    if (next.status === 'won') haptic('win');
    else if (next.status === 'lost') haptic('lose');
    else haptic('wrong');

    if (mode.kind === 'practice') {
      setPractice(next);
      return;
    }
    setDaily(next);
    if (!data) return;
    if (next.status === 'playing') persist({ ...data, inProgress: { day: today, round: next } });
    else persist(recordFinished(data, today, next));
  };

  const doShare = async () => {
    haptic('tap');
    const text = shareText(round);
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
          flash('Select the squares above to copy your result');
        }
        return;
      }
      await Share.share({ message: text });
    } catch {
      flash('Could not share. Long-press the squares to copy.');
    }
  };

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const guessed = round.guesses.flatMap((g) => (g.kind === 'skip' ? [] : [g.answerId]));
  const showHint = round.status === 'playing' && misses(round) >= HINT_AFTER_MISSES;
  const finished = round.status !== 'playing';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Pressable onPress={() => setSheet('howto')} hitSlop={10}>
            <Text style={styles.headerBtn}>?</Text>
          </Pressable>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.title}>Pull Back</Text>
            <Text style={styles.subtitle}>
              {mode.kind === 'daily' ? `Daily #${todayNumber}` : `Practice ${mode.index + 1} · doesn't count`}
            </Text>
          </View>
          <Pressable onPress={() => setSheet('stats')} hitSlop={10}>
            <Text style={styles.headerBtn}>▤</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ZoomImage source={puzzle.image} size={size} focal={puzzle.focal} shares={shares} level={level} />

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

          <GuessList round={round} />

          {finished ? (
            <Result
              round={round}
              answer={answer}
              credit={puzzle.credit}
              onShare={doShare}
              isDaily={mode.kind === 'daily'}
              onBackToDaily={() => setMode({ kind: 'daily' })}
              onPractice={() => setSheet('practice')}
            />
          ) : null}
        </ScrollView>
        {!finished && (
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

      <Sheet visible={sheet === 'howto'} onClose={() => {
        setSheet(null);
        if (data && !data.seenHowTo) persist({ ...data, seenHowTo: true });
      }}>
        <HowTo />
      </Sheet>
      <Sheet visible={sheet === 'stats'} onClose={() => setSheet(null)}>
        {data && <StatsView data={data} today={today} />}
        <Pressable style={styles.secondary} onPress={() => setSheet('practice')}>
          <Text style={styles.secondaryText}>Practice puzzles</Text>
        </Pressable>
      </Sheet>
      <Sheet visible={sheet === 'practice'} onClose={() => setSheet(null)}>
        <Text style={styles.sheetTitle}>Practice</Text>
        <Text style={styles.sheetBody}>
          Every puzzle in the prototype. These don't count toward your streak.
        </Text>
        <View style={styles.grid}>
          {PUZZLES.map((p, i) => (
            <Pressable
              key={p.id}
              style={({ pressed }) => [styles.gridItem, pressed && { backgroundColor: C.raised }]}
              onPress={() => {
                setPractice(newRound(i + 1));
                setMode({ kind: 'practice', index: i });
                setSheet(null);
              }}
            >
              <Text style={styles.gridNum}>{i + 1}</Text>
              <Text style={styles.gridDiff}>{p.difficulty}</Text>
            </Pressable>
          ))}
        </View>
        {mode.kind === 'practice' && (
          <Pressable style={styles.secondary} onPress={() => { setMode({ kind: 'daily' }); setSheet(null); }}>
            <Text style={styles.secondaryText}>Back to today's puzzle</Text>
          </Pressable>
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

function Result({
  round,
  answer,
  credit,
  onShare,
  isDaily,
  onBackToDaily,
  onPractice,
}: {
  round: RoundState;
  answer: Answer;
  credit: { title: string; author: string; license: string };
  onShare: () => void;
  isDaily: boolean;
  onBackToDaily: () => void;
  onPractice: () => void;
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
        It was {/^[aeiou]/i.test(answer.name) ? 'an' : 'a'} <Text style={{ color: C.accent }}>{answer.name}</Text>
      </Text>
      <Text selectable style={styles.squares}>
        {shareTextSquares(round)}
      </Text>
      <Pressable onPress={onShare} style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
        <Text style={styles.primaryText}>Share result</Text>
      </Pressable>
      {isDaily ? (
        <Text style={styles.next}>Next photo in {clock}</Text>
      ) : (
        <Pressable onPress={onBackToDaily}>
          <Text style={styles.link}>Back to today's puzzle</Text>
        </Pressable>
      )}
      <Pressable onPress={onPractice}>
        <Text style={styles.link}>Play a practice puzzle</Text>
      </Pressable>
      <Text style={styles.credit}>
        Photo: {credit.title} by {credit.author}, {credit.license}
      </Text>
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
      <Text style={styles.sheetBody}>A new photo arrives at midnight.</Text>
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
  result: { alignItems: 'center', marginTop: 18, width: '100%', maxWidth: 440 },
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  gridItem: {
    width: 62,
    height: 62,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.line,
  },
  gridNum: { color: C.text, fontSize: 18, fontWeight: '800' },
  gridDiff: { color: C.faint, fontSize: 10, marginTop: 2 },
});
