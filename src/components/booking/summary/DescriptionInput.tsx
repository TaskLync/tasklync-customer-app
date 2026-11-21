import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ChevronDownIcon, ChevronUpIcon } from '../../ui/Icon/icons';
import { fontFamily } from '../../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface DescriptionInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const DescriptionInput: React.FC<DescriptionInputProps> = ({
  value,
  onChangeText,
}) => {
  const { colors, palette } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [isExpanded, setIsExpanded] = useState<boolean>(Boolean(value));
  const heightProgress = useSharedValue(value ? 1 : 0);

  const toggleExpand = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    heightProgress.value = withSpring(nextState ? 1 : 0, {
      damping: 15,
      stiffness: 200,
    });
  };

  const animatedInputStyle = useAnimatedStyle(() => ({
    maxHeight: heightProgress.value * 120,
    opacity: heightProgress.value,
    marginTop: heightProgress.value * 10,
  }));

  return (
    <View style={styles.card}>
      <Pressable
        onPress={toggleExpand}
        style={styles.headerRow}
        hitSlop={{ top: 8, bottom: 8 }}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        accessibilityLabel="Note for provider, optional"
      >
        <View style={styles.leftGroup}>
          <Text style={styles.headerTitle}>Note for provider</Text>
          <Text style={styles.optional}>Optional</Text>
        </View>

        {isExpanded ? (
          <ChevronUpIcon size={18} color={colors.textMuted} />
        ) : (
          <ChevronDownIcon size={18} color={colors.textMuted} />
        )}
      </Pressable>

      {isExpanded && (
        <Animated.View style={[styles.inputWrapper, animatedInputStyle]}>
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder="e.g. Ring the doorbell twice"
            placeholderTextColor={palette.gray400}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={250}
          />
          <Text style={styles.charCount}>{value.length}/250</Text>
        </Animated.View>
      )}
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  headerTitle: {
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 15,
    lineHeight: 21,
    color: colors.textPrimary,
  },
  optional: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 21,
    color: colors.textMuted,
  },
  inputWrapper: {
    overflow: 'hidden',
  },
  textInput: {
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
    minHeight: 70,
  },
  charCount: {
    fontFamily: fontFamily.inter.regular,
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
});
