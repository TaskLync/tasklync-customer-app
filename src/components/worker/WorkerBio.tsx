import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ViewStyle,
  LayoutAnimation,
  NativeSyntheticEvent,
  TextLayoutEventData,
} from 'react-native';
import { colors } from '../../design/colors';
import { typography } from '../../design/typography';

/** Lines shown while collapsed. Bios at or below this length never show a toggle. */
const COLLAPSED_LINES = 4;

interface WorkerBioProps {
  bio: string | null;
  style?: ViewStyle;
}

/**
 * "About" section. Height is fully content-driven: a short bio renders compactly,
 * a long bio is clamped to COLLAPSED_LINES with a "Read more" toggle. No fixed heights.
 */
export const WorkerBio: React.FC<WorkerBioProps> = ({ bio, style }) => {
  const [expanded, setExpanded] = useState(false);
  // Total line count of the full text at the current width (from an off-screen twin).
  const [lineCount, setLineCount] = useState(0);

  const handleMeasure = useCallback((e: NativeSyntheticEvent<TextLayoutEventData>) => {
    setLineCount(e.nativeEvent.lines.length);
  }, []);

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setExpanded((prev) => !prev);
  }, []);

  const text = bio?.trim();
  if (!text) return null;

  const isTruncatable = lineCount > COLLAPSED_LINES;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.sectionHeader}>About</Text>

      {/* Invisible twin: measures the natural line count without affecting layout. */}
      <Text
        style={[styles.bioText, styles.measure]}
        onTextLayout={handleMeasure}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {text}
      </Text>

      <Text
        style={styles.bioText}
        numberOfLines={expanded || !isTruncatable ? undefined : COLLAPSED_LINES}
      >
        {text}
      </Text>

      {isTruncatable && (
        <Pressable
          onPress={handleToggle}
          style={styles.toggleButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <Text style={styles.toggleText}>{expanded ? 'Show less' : 'Read more'}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  sectionHeader: {
    fontFamily: typography.fontFamily.poppins.semiBold,
    fontSize: 16,
    color: colors.textPrimary || '#0F172A',
    marginBottom: 12,
  },
  measure: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0,
  },
  bioText: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 14,
    color: colors.textSecondary || '#475569',
    lineHeight: 22,
  },
  toggleButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  toggleText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.primary || '#16A34A',
  },
});
