import { useEffect, useState } from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type Props = {
  source: ImageSourcePropType;
  size: number;
  /** Focal point in 0..1 image coordinates. */
  focal: { x: number; y: number };
  /** Share of the photo visible at each level, levels 1..6. */
  shares: number[];
  /** Level to show, 1..6. */
  level: number;
  /** Milliseconds for the move between levels. */
  duration?: number;
};

/**
 * Square photo window. Each level shows a fixed share of the photo's area around the focal
 * point. Zoom is interpolated in log space so every step feels like the same "pull back".
 */
export function ZoomImage({ source, size, focal, shares, level, duration = 650 }: Props) {
  const lvl = useSharedValue(level);
  // Keep the photo hidden until it has loaded with the zoom applied, so the full
  // picture never flashes on screen before the crop takes effect.
  const [loaded, setLoaded] = useState(false);
  const logZooms = shares.map((s) => Math.log(1 / Math.sqrt(s)));

  useEffect(() => {
    // Only ever animate outwards. Moving to a tighter level (a new puzzle) must jump
    // straight there, or the zoom-in would flash the whole photo first.
    if (level > lvl.value) {
      lvl.value = withTiming(level, { duration, easing: Easing.inOut(Easing.cubic) });
    } else {
      lvl.value = level;
    }
  }, [level, duration, lvl]);

  const style = useAnimatedStyle(() => {
    const l = Math.min(Math.max(lvl.value, 1), logZooms.length);
    const i = Math.min(Math.floor(l) - 1, logZooms.length - 2);
    const t = l - 1 - i;
    const z = Math.exp(logZooms[i] + (logZooms[i + 1] - logZooms[i]) * t);
    // Keep the visible window inside the photo.
    const half = 0.5 / z;
    const cx = Math.min(Math.max(focal.x, half), 1 - half);
    const cy = Math.min(Math.max(focal.y, half), 1 - half);
    return {
      transform: [
        { translateX: -z * (cx - 0.5) * size },
        { translateY: -z * (cy - 0.5) * size },
        { scale: z },
      ],
    };
  });

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <Animated.View style={[{ width: size, height: size, opacity: loaded ? 1 : 0 }, style]}>
        <Image
          source={source}
          style={{ width: size, height: size }}
          resizeMode="cover"
          onLoad={() => requestAnimationFrame(() => setLoaded(true))}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderRadius: 18, backgroundColor: '#1c1a17' },
});
