import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  BellIcon,
  ChevronRightIcon,
  ClockIcon,
  CreditCardIcon,
  DeleteIcon,
  DocumentIcon,
  GlobeIcon,
  HelpCircleIcon,
  LocationIcon,
  LogoutIcon,
  SettingsIcon,
  ShieldAlertIcon,
  StarIcon,
  SupportIcon,
  UserRemoveIcon,
} from '../ui/Icon/icons';
import { ProfileMenuItemConfig } from '../../types/user.types';
import { fontFamily, radius } from '../../design';
import type { AppTheme } from '../../theme/useAppTheme';
import { useAppTheme, useThemedStyles } from '../../theme/useAppTheme';

export interface ProfileMenuItemProps {
  item: ProfileMenuItemConfig;
  onPress: (item: ProfileMenuItemConfig) => void;
  isLast?: boolean;
}

const renderIcon = (iconName: string, isDanger: boolean, colors: AppTheme['colors']) => {
  const iconColor = isDanger ? colors.textDanger : colors.iconDefault;
  const iconSize = 19;

  switch (iconName) {
    case 'MapPin':
      return <LocationIcon size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Bell':
      return <BellIcon size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Globe':
      return <GlobeIcon size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Headphones':
      return <SupportIcon size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'HelpCircle':
      return <HelpCircleIcon size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Star':
      return <StarIcon size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'FileText':
      return <DocumentIcon size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Trash2':
      return <DeleteIcon size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'LogOut':
      return <LogoutIcon size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'CreditCard':
      return <CreditCardIcon size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Settings':
      return <SettingsIcon size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Clock':
      return <ClockIcon size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'UserX':
      return <UserRemoveIcon size={iconSize} color={iconColor} strokeWidth={2} />;
    default:
      return <ShieldAlertIcon size={iconSize} color={iconColor} strokeWidth={2} />;
  }
};

/**
 * ProfileMenuItem Component
 *
 * Separate rounded rectangular card with subtle surface:
 * - 56px minimum tap height
 * - Clean outline icons with green brand tint
 * - Soft border and minimal elevation
 */
export const ProfileMenuItem: React.FC<ProfileMenuItemProps> = ({
  item,
  onPress,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const isDanger = item.tone === 'danger';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.card, isDanger && styles.cardDanger]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.label}, ${item.subtitle || ''}`}
    >
      {/* Icon Pill */}
      <View style={[styles.iconContainer, isDanger && styles.iconContainerDanger]}>
        {renderIcon(item.icon, isDanger, colors)}
      </View>

      {/* Label & Subtitle Text Col */}
      <View style={styles.textCol}>
        <Text style={[styles.label, isDanger && styles.labelDanger]} numberOfLines={1}>
          {item.label}
        </Text>
      </View>

      {/* Right Accessory (Badge or Chevron) */}
      <View style={styles.rightAccessory}>
        {item.badge ? (
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        ) : (
          <ChevronRightIcon size={17} color={isDanger ? colors.textDanger : colors.textMuted} strokeWidth={2.2} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingVertical: 14,
    minHeight: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cardDanger: {},
  iconContainer: {
    width: 28,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconContainerDanger: {},
  textCol: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14.5,
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },
  labelDanger: {
    color: colors.textDanger,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1.5,
  },
  rightAccessory: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    backgroundColor: colors.bgHover,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 11,
    color: colors.textGreen,
  },
});
