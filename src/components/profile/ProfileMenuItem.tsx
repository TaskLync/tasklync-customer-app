import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  MapPin,
  Bell,
  Globe,
  Headphones,
  Star,
  FileText,
  Trash2,
  ChevronRight,
  LogOut,
  ShieldAlert,
  CreditCard,
  Settings,
  HelpCircle,
  Clock,
  UserX,
} from 'lucide-react-native';
import { ProfileMenuItemConfig } from '../../types/user.types';
import { colors, fontFamily, radius } from '../../design';

export interface ProfileMenuItemProps {
  item: ProfileMenuItemConfig;
  onPress: (item: ProfileMenuItemConfig) => void;
  isLast?: boolean;
}

const renderIcon = (iconName: string, isDanger: boolean) => {
  const iconColor = isDanger ? colors.textDanger : colors.primaryDark;
  const iconSize = 19;

  switch (iconName) {
    case 'MapPin':
      return <MapPin size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Bell':
      return <Bell size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Globe':
      return <Globe size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Headphones':
      return <Headphones size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'HelpCircle':
      return <HelpCircle size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Star':
      return <Star size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'FileText':
      return <FileText size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Trash2':
      return <Trash2 size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'LogOut':
      return <LogOut size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'CreditCard':
      return <CreditCard size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Settings':
      return <Settings size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'Clock':
      return <Clock size={iconSize} color={iconColor} strokeWidth={2} />;
    case 'UserX':
      return <UserX size={iconSize} color={iconColor} strokeWidth={2} />;
    default:
      return <ShieldAlert size={iconSize} color={iconColor} strokeWidth={2} />;
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
        {renderIcon(item.icon, isDanger)}
      </View>

      {/* Label & Subtitle Text Col */}
      <View style={styles.textCol}>
        <Text style={[styles.label, isDanger && styles.labelDanger]} numberOfLines={1}>
          {item.label}
        </Text>
        {item.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right Accessory (Badge or Chevron) */}
      <View style={styles.rightAccessory}>
        {item.badge ? (
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        ) : (
          <ChevronRight size={17} color={isDanger ? colors.textDanger : '#94A3B8'} strokeWidth={2.2} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 15,
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerDanger: {
    backgroundColor: '#FEE2E2',
  },
  textCol: {
    flex: 1,
    paddingRight: 10,
  },
  label: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 14.5,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  labelDanger: {
    color: colors.textDanger,
  },
  subtitle: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1.5,
  },
  rightAccessory: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontFamily: fontFamily.inter.bold,
    fontSize: 11,
    color: '#15803D',
  },
});
