import { View, StyleSheet, DimensionValue } from 'react-native';
import { Skeleton, SkeletonGroup } from '../ui/Skeleton/Skeleton';
import { useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

/** One line of 15/21 text + 7px vertical padding = 35; two lines = 56 (MessageBubble). */
const ONE_LINE = 35;
const TWO_LINES = 56;

type Bubble = { out: boolean; width: DimensionValue; height: number; continuation?: boolean };

// A believable thread: grouped consecutive messages, mixed lengths, newest at the bottom.
const THREAD: Bubble[] = [
  { out: false, width: '62%', height: TWO_LINES },
  { out: false, width: '38%', height: ONE_LINE, continuation: true },
  { out: true, width: '54%', height: ONE_LINE },
  { out: true, width: '70%', height: TWO_LINES, continuation: true },
  { out: false, width: '46%', height: ONE_LINE },
  { out: true, width: '32%', height: ONE_LINE },
];

/**
 * Mirrors the message list: no avatars, 12px gutters, 16px radius bubbles capped at 80% width,
 * 10px between sender groups and 2px within one. Outgoing bubbles keep their green tint so the
 * placeholder reads as "your messages / their messages".
 */
export function ChatSkeleton() {
  const styles = useThemedStyles(createStyles);
  return (
    <SkeletonGroup style={styles.container} accessibilityLabel="Loading messages">
      {THREAD.map((b, i) => (
        <View
          key={i}
          style={[
            styles.row,
            b.out ? styles.rowOut : styles.rowIn,
            { marginTop: b.continuation ? 2 : 10 },
          ]}
        >
          <Skeleton
            width={b.width}
            height={b.height}
            borderRadius={16}
            style={b.out ? styles.outgoing : undefined}
          />
        </View>
      ))}
    </SkeletonGroup>
  );
}

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  rowIn: {
    justifyContent: 'flex-start',
  },
  rowOut: {
    justifyContent: 'flex-end',
  },
  outgoing: {
    backgroundColor: colors.primaryBorderSubtle,
  },
});
