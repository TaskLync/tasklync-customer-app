import React from 'react';
import { StyleSheet, View, Text, ViewStyle } from 'react-native';
import { ShieldCheck } from 'lucide-react-native';
import { colors } from '../../design/colors';
import { radius } from '../../design/radius';
import { typography } from '../../design/typography';

interface VerifiedBadgeProps {
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  style?: ViewStyle;
}

export const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({
  size = 'sm',
  showLabel = true,
  style,
}) => {
  const isXs = size === 'xs';
  const isMd = size === 'md';

  const iconSize = isXs ? 12 : isMd ? 14 : 12;

  if (isXs || !showLabel) {
    return (
      <View style={[styles.compactContainer, style]}>
        <ShieldCheck size={iconSize} color={colors.primary} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.badgeContainer,
        isMd ? styles.badgeMd : styles.badgeSm,
        style,
      ]}
    >
      <ShieldCheck size={iconSize} color={colors.primaryDark} style={styles.icon} />
      <Text style={[styles.text, isMd ? styles.textMd : styles.textSm]}>
        Verified Worker
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  compactContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.lightGreen,
    borderRadius: radius.pill,
    padding: 3,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.lightGreen,
    borderWidth: 1,
    borderColor: colors.lightGreenBorder,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeMd: {
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontFamily: typography.fontFamily.jakarta.semiBold,
    color: colors.primaryDark,
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 13,
  },
});
