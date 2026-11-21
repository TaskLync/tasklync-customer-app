import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AcIcon,
  CarIcon,
  FlashIcon,
  HammerIcon,
  HelpCircleIcon,
  PainterIcon,
  ScissorsIcon,
  SparklesIcon,
  WrenchIcon,
} from '../ui/Icon/icons';
import { useAppTheme, type AppTheme } from '../../theme/useAppTheme';
import { useThemedStyles } from '../../theme/useAppTheme';

interface WorkerMarkerBadgeProps {
  category?: string;
  size?: number;
}

export const getCategoryMeta = (category: string | undefined, { colors, palette }: AppTheme) => {
  const normalized = (category || '').toLowerCase();

  if (normalized.includes('electr')) {
    return { icon: FlashIcon, bg: palette.amber100, color: colors.warningMedium, label: 'Electrician' };
  }
  if (normalized.includes('plumb')) {
    return { icon: WrenchIcon, bg: palette.sky100, color: palette.sky600, label: 'Plumber' };
  }
  if (normalized.includes('ac') || normalized.includes('air') || normalized.includes('hvac')) {
    return { icon: AcIcon, bg: palette.blue100, color: palette.blue700, label: 'AC Repair' };
  }
  if (normalized.includes('clean')) {
    return { icon: SparklesIcon, bg: colors.primaryLight, color: colors.primaryDark, label: 'Cleaner' };
  }
  if (normalized.includes('paint')) {
    return { icon: PainterIcon, bg: palette.pink100, color: palette.pink600, label: 'Painter' };
  }
  if (normalized.includes('carpent') || normalized.includes('wood')) {
    return { icon: HammerIcon, bg: palette.orange100, color: palette.orange600, label: 'Carpenter' };
  }
  if (normalized.includes('mechanic') || normalized.includes('auto')) {
    return { icon: CarIcon, bg: palette.purple100, color: palette.purple600, label: 'Mechanic' };
  }
  if (normalized.includes('barber') || normalized.includes('salon') || normalized.includes('beauty')) {
    return { icon: ScissorsIcon, bg: palette.rose100, color: palette.rose600, label: 'Salon' };
  }

  return { icon: HelpCircleIcon, bg: colors.canvasGray, color: colors.textMuted, label: 'Handyman' };
};

export const WorkerMarkerBadge: FC<WorkerMarkerBadgeProps> = ({
  category,
  size = 18,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const theme = useAppTheme();
  const meta = getCategoryMeta(category, theme);
  const IconComponent = meta.icon;
  const iconSize = Math.max(10, Math.floor(size * 0.6));

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: meta.bg,
          borderColor: colors.bgCard,
        },
      ]}
    >
      <IconComponent size={iconSize} color={meta.color} />
    </View>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    elevation: 3,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
});
