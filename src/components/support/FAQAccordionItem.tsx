import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { ChevronDownIcon } from '../ui/Icon/icons';
import { fontFamily } from '../../design';
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

export const FAQAccordionItem: React.FC<FAQAccordionItemProps> = ({ item, isExpanded, onToggle }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const rotation = useSharedValue(isExpanded ? 180 : 0);

  useEffect(() => {
    rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 180 });
  }, [isExpanded, rotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel={item.question}
        accessibilityHint={isExpanded ? 'Hides the answer' : 'Shows the answer'}
      >
        <Text style={styles.question} maxFontSizeMultiplier={1.3}>
          {item.question}
        </Text>
        <Animated.View style={[styles.chevron, chevronStyle]}>
          <ChevronDownIcon size={18} color={colors.textMuted} strokeWidth={2} />
        </Animated.View>
      </Pressable>

      {isExpanded && (
        <Animated.View entering={FadeIn.duration(180)} style={styles.body}>
          <Text style={styles.answer} maxFontSizeMultiplier={1.3}>
            {item.answer}
          </Text>
        </Animated.View>
      )}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerPressed: {
    backgroundColor: colors.bgHover,
  },
  question: {
    flex: 1,
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
    marginRight: 12,
  },
  chevron: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    marginTop: -4,
  },
  answer: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textSecondary,
  },
});
