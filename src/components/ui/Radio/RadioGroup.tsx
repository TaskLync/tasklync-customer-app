import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useDerivedValue,
} from 'react-native-reanimated';
import { typography } from '../../../design/typography';
import { springConfig } from '../../../design/animations';
import { useThemedStyles, type AppTheme } from '../../../theme/useAppTheme';

export interface RadioOption {
  label: string;
  value: string;
  description?: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  selected: string;
  onChange: (value: string) => void;
  style?: ViewStyle;
}

const AnimatedView = Animated.createAnimatedComponent(View);

export const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  selected,
  onChange,
  style,
}) => {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={[styles.container, style]} accessibilityRole="radiogroup">
      {options.map((option, index) => {
        const isSelected = selected === option.value;
        const isLast = index === options.length - 1;

        return (
          <RadioOptionItem
            key={option.value}
            option={option}
            isSelected={isSelected}
            isLast={isLast}
            onSelect={() => {
              if (!isSelected) {
                onChange(option.value);
              }
            }}
          />
        );
      })}
    </View>
  );
};

const RadioOptionItem: React.FC<{
  option: RadioOption;
  isSelected: boolean;
  isLast: boolean;
  onSelect: () => void;
}> = ({ option, isSelected, isLast, onSelect }) => {
  const styles = useThemedStyles(createStyles);
  // Reanimated 3 standard animation
  const scale = useDerivedValue(() => {
    return withSpring(isSelected ? 1 : 0, isSelected ? springConfig.snappy : springConfig.stiff);
  }, [isSelected]);

  const innerDotStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: scale.value,
    };
  });

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.optionContainer,
        !isLast && styles.optionBorder,
        pressed && styles.optionPressed,
      ]}
      accessibilityRole="radio"
      accessibilityState={{ checked: isSelected }}
    >
      <View
        style={[
          styles.radioCircle,
          isSelected && styles.radioCircleSelected,
        ]}
      >
        <AnimatedView style={[styles.innerDot, innerDotStyle]} />
      </View>

      <View style={styles.textContainer}>
        <Text
          style={[
            styles.label,
            isSelected && styles.labelSelected,
          ]}
        >
          {option.label}
        </Text>
        {option.description && (
          <Text style={styles.description}>{option.description}</Text>
        )}
      </View>
    </Pressable>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  container: {
    width: '100%',
  },
  optionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionPressed: {
    backgroundColor: colors.bgSection,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: colors.primary,
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  label: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 14,
    color: colors.textPrimary,
  },
  labelSelected: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
  },
  description: {
    fontFamily: typography.fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});
