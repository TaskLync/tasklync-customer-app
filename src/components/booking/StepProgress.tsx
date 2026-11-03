import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontFamily } from '../../design';

export interface StepProgressProps {
  steps?: string[];
  /** 0-indexed active step. */
  activeIndex?: number;
  /** Optional 1-based step alias (e.g. 2 = Schedule). */
  currentStep?: number;
}

const DEFAULT_STEPS = ['Services', 'Schedule', 'Address', 'Review'];

export const StepProgress: React.FC<StepProgressProps> = ({
  steps = DEFAULT_STEPS,
  activeIndex,
  currentStep,
}) => {
  const resolvedActiveIndex =
    typeof activeIndex === 'number'
      ? activeIndex
      : typeof currentStep === 'number'
      ? currentStep - 1
      : 1;

  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <View style={styles.bars}>
        {steps.map((_, index) => (
          <View
            key={`step-bar-${index}`}
            style={[styles.bar, index <= resolvedActiveIndex && styles.barActive]}
          />
        ))}
      </View>
      <Text style={styles.label}>
        {`Step ${resolvedActiveIndex + 1} of ${steps.length} \u00B7 ${steps[resolvedActiveIndex] ?? ''}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
    backgroundColor: colors.bgCard,
  },
  bars: {
    flexDirection: 'row',
    gap: 4,
  },
  bar: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  barActive: {
    backgroundColor: colors.primaryDark,
  },
  label: {
    marginTop: 8,
    fontFamily: fontFamily.jakarta.medium,
    fontSize: 12,
    color: colors.textSecondary,
  },
});