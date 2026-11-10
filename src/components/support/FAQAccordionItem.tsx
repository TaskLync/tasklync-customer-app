import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { ChevronDown } from 'lucide-react-native';
import { fontFamily, spacing } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

export interface FAQItemData {
  id: string;
  question: string;
  answer: string;
}

export interface FAQAccordionItemProps {
  item: FAQItemData;
  isExpanded: boolean;
  onToggle: () => void;
}

export const FAQAccordionItem: React.FC<FAQAccordionItemProps> = ({
  item,
  isExpanded,
  onToggle,
}) => {
  const { palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const rotation = useSharedValue(isExpanded ? 180 : 0);

  useEffect(() => {
    rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 150 });
  }, [isExpanded, rotation]);

  const chevronAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onToggle}
        style={styles.headerRow}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={`${item.question}, ${isExpanded ? 'collapse answer' : 'expand answer'}`}
      >
        <Text
          style={styles.questionText}
          maxFontSizeMultiplier={1.3}
        >
          {item.question}
        </Text>

        <Animated.View style={[styles.chevronBox, chevronAnimatedStyle]}>
          <ChevronDown size={18} color={palette.gray500} />
        </Animated.View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.contentBody}>
          <Text
            style={styles.answerText}
            maxFontSizeMultiplier={1.3}
          >
            {item.answer}
          </Text>
        </View>
      )}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    backgroundColor: colors.bgCard,
  },
  headerRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 4,
  },
  questionText: {
    flex: 1,
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
    marginRight: spacing.sm,
  },
  chevronBox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentBody: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.base,
    paddingTop: spacing.xs,
  },
  answerText: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
});
