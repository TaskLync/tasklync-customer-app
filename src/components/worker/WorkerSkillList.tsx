import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, Text, Pressable, ViewStyle, LayoutAnimation } from 'react-native';
import { Chip } from '../ui/Chip/Chip';
import { colors } from '../../design/colors';
import { typography } from '../../design/typography';
import { WorkerSkill } from '../../types/worker.types';

/** Chips shown before the "Show more" toggle appears. */
const INITIAL_VISIBLE = 6;

interface WorkerSkillListProps {
  skills: WorkerSkill[];
  style?: ViewStyle;
}

/**
 * "Skills & Expertise". Chips wrap naturally and the section height follows the number of
 * rows — 2 skills = one compact row, many skills = as many rows as needed. No fixed heights.
 */
export const WorkerSkillList: React.FC<WorkerSkillListProps> = ({ skills, style }) => {
  const [expanded, setExpanded] = useState(false);

  // Verified skills first (stable for equal verification state).
  const sortedSkills = useMemo(
    () =>
      [...(skills ?? [])].sort((a, b) => {
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;
        return 0;
      }),
    [skills],
  );

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.create(220, 'easeInEaseOut', 'opacity'));
    setExpanded((prev) => !prev);
  }, []);

  if (sortedSkills.length === 0) return null;

  const hasOverflow = sortedSkills.length > INITIAL_VISIBLE;
  const visibleSkills = expanded || !hasOverflow ? sortedSkills : sortedSkills.slice(0, INITIAL_VISIBLE);
  const remainingCount = sortedSkills.length - INITIAL_VISIBLE;

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.sectionHeader}>Skills & Expertise</Text>

      <View style={styles.chipGrid}>
        {visibleSkills.map((skill) => (
          <Chip
            key={skill.id}
            variant={skill.isVerified ? 'skill' : 'tag'}
            selected={skill.isVerified}
            label={skill.isVerified ? `✓ ${skill.categoryName}` : skill.categoryName}
            size="sm"
          />
        ))}
      </View>

      {hasOverflow && (
        <Pressable
          onPress={handleToggle}
          style={styles.toggleButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
        >
          <Text style={styles.toggleText}>
            {expanded ? 'Show fewer skills' : `Show ${remainingCount} more`}
          </Text>
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggleButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  toggleText: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    fontSize: 13,
    color: colors.primary || '#16A34A',
  },
});
