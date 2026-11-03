import { FC, useState } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors } from '../../design/colors';
import { typography } from '../../design/typography';
import { springConfig } from '../../design/animations';

interface CartNoteInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

export const CartNoteInput: FC<CartNoteInputProps> = ({
  value,
  onChangeText,
}) => {
  const [isExpanded, setIsExpanded] = useState(!!value);
  const opacity = useSharedValue(isExpanded ? 1 : 0);

  const toggleExpand = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    opacity.value = withSpring(nextState ? 1 : 0, springConfig.default);
  };

  const animatedInputStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.card}>
      <Pressable
        style={styles.headerRow}
        onPress={toggleExpand}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={isExpanded ? 'Collapse note for worker' : 'Add note for worker'}
      >
        <View style={styles.leftGroup}>
          {/* Plus Jakarta Sans text */}
          <Text style={styles.headerText}>
            {value ? 'Note for worker' : '+ Add a note for the worker'}
          </Text>
        </View>

        {isExpanded ? (
          <ChevronUp size={18} color={colors.textMuted} />
        ) : (
          <ChevronDown size={18} color={colors.textMuted} />
        )}
      </Pressable>

      {isExpanded && (
        <Animated.View style={[styles.inputContainer, animatedInputStyle]}>
          <TextInput
            style={styles.input}
            placeholder="E.g., Please bring a long ladder, ring the doorbell twice..."
            placeholderTextColor={colors.textMuted}
            value={value}
            onChangeText={onChangeText}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgCard,
    marginHorizontal: 20,
    paddingVertical: 14,
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
    gap: 8,
  },
  headerText: {
    fontFamily: typography.fontFamily.jakarta.medium, // Plus Jakarta Sans
    fontSize: typography.fontSize.body2,
    color: colors.textSecondary,
  },
  inputContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: typography.fontSize.body2,
    color: colors.textPrimary,
    minHeight: 70,
    padding: 12,
    backgroundColor: colors.bgInput,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
