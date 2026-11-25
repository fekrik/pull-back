import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Answer, suggest } from '../data/answers';
import { C } from '../theme';

type Props = {
  exclude: string[];
  onGuess: (a: Answer) => void;
  onSkip: () => void;
};

/** Free text is not accepted: the player must pick an entry from the list. */
export function GuessInput({ exclude, onGuess, onSkip }: Props) {
  const [text, setText] = useState('');
  const options = useMemo(() => suggest(text, exclude, 5), [text, exclude]);

  const pick = (a: Answer) => {
    setText('');
    onGuess(a);
  };

  return (
    <View style={styles.wrap}>
      {options.length > 0 && (
        <View style={styles.list}>
          {options.map((a) => (
            <Pressable
              key={a.id}
              onPress={() => pick(a)}
              style={({ pressed }) => [styles.option, pressed && { backgroundColor: C.raised }]}
            >
              <Text style={styles.optionText}>{a.name}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {text.length > 1 && options.length === 0 && (
        <Text style={styles.none}>Not in the list. Try another word for it.</Text>
      )}
      <View style={styles.row}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="What is it?"
          placeholderTextColor={C.faint}
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.input}
          onSubmitEditing={() => options[0] && pick(options[0])}
          returnKeyType="done"
        />
        <Pressable onPress={onSkip} style={({ pressed }) => [styles.skip, pressed && { opacity: 0.7 }]}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  list: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    marginBottom: 8,
    overflow: 'hidden',
  },
  option: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: C.line },
  optionText: { color: C.text, fontSize: 17, textTransform: 'capitalize' },
  none: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: '100%',
    color: C.dim,
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    backgroundColor: C.bg,
    paddingVertical: 6,
  },
  row: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: C.card,
    color: C.text,
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  skip: {
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
  },
  skipText: { color: C.dim, fontSize: 16, fontWeight: '600' },
});
