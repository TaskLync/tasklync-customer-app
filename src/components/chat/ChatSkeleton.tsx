import { colors, palette } from '../../design';
import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

function SkeletonBubble({ isOutgoing, width }: { isOutgoing: boolean; width: number | string }) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 750 }),
        withTiming(0.4, { duration: 750 })
      ),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.row, isOutgoing ? styles.rowOutgoing : styles.rowIncoming]}>
      {!isOutgoing && <Animated.View style={[styles.avatar, animatedStyle]} />}
      <Animated.View
        style={[
          styles.bubble,
          isOutgoing ? styles.bubbleOutgoing : styles.bubbleIncoming,
          { width: width as any },
          animatedStyle,
        ]}
      />
    </View>
  );
}

export function ChatSkeleton() {
  return (
    <View style={styles.container}>
      <SkeletonBubble isOutgoing={false} width="65%" />
      <SkeletonBubble isOutgoing={true} width="45%" />
      <SkeletonBubble isOutgoing={false} width="80%" />
      <SkeletonBubble isOutgoing={true} width="55%" />
      <SkeletonBubble isOutgoing={false} width="50%" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    justifyContent: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 8,
  },
  rowIncoming: {
    justifyContent: 'flex-start',
  },
  rowOutgoing: {
    justifyContent: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  bubble: {
    height: 48,
    borderRadius: 18,
  },
  bubbleIncoming: {
    backgroundColor: colors.bgCard,
    borderBottomLeftRadius: 4,
  },
  bubbleOutgoing: {
    backgroundColor: colors.primaryBorderSubtle,
    borderBottomRightRadius: 4,
  },
});
