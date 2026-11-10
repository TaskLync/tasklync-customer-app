import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
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
      <Pressable onPress={toggleExpand} style={styles.headerRow}>
        <View style={styles.leftGroup}>
          <Text style={styles.headerTitle}>Notes for provider (optional)</Text>
        </View>

        {isExpanded ? (
          <ChevronUp size={18} color={colors.textMuted} />
        ) : (
          <ChevronDown size={18} color={colors.textMuted} />
        )}
      </Pressable>

      {isExpanded && (
        <Animated.View style={[styles.inputWrapper, animatedInputStyle]}>
          <TextInput
            style={styles.textInput}
            value={value}
            onChangeText={onChangeText}
            placeholder="e.g. Please bring extra extension cord, ring doorbell twice..."
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

const createStyles = ({ colors, palette }: AppTheme) => StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    paddingVertical: 16,
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  inputWrapper: {
    overflow: 'hidden',
  },
  textInput: {
    backgroundColor: colors.bgInput,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13,
    lineHeight: 18,
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
