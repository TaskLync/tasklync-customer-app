import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Zap,
  Wrench,
  AirVent,
  Sparkles,
  Palette,
  Hammer,
  Car,
  Scissors,
  HelpCircle,
} from 'lucide-react-native';
import { colors, palette } from '../../design/colors';

interface WorkerMarkerBadgeProps {
  category?: string;
  size?: number;
}

export const getCategoryMeta = (category?: string) => {
  const normalized = (category || '').toLowerCase();

  if (normalized.includes('electr')) {
    return { icon: Zap, bg: palette.amber100, color: colors.warningMedium, label: 'Electrician' };
  }
  if (normalized.includes('plumb')) {
    return { icon: Wrench, bg: palette.sky100, color: palette.sky600, label: 'Plumber' };
  }
  if (normalized.includes('ac') || normalized.includes('air') || normalized.includes('hvac')) {
    return { icon: AirVent, bg: palette.blue100, color: palette.blue700, label: 'AC Repair' };
  }
  if (normalized.includes('clean')) {
    return { icon: Sparkles, bg: colors.primaryLight, color: colors.primaryDark, label: 'Cleaner' };
  }
  if (normalized.includes('paint')) {
    return { icon: Palette, bg: palette.pink100, color: palette.pink600, label: 'Painter' };
  }
  if (normalized.includes('carpent') || normalized.includes('wood')) {
    return { icon: Hammer, bg: palette.orange100, color: palette.orange600, label: 'Carpenter' };
  }
  if (normalized.includes('mechanic') || normalized.includes('auto')) {
    return { icon: Car, bg: palette.purple100, color: palette.purple600, label: 'Mechanic' };
  }
  if (normalized.includes('barber') || normalized.includes('salon') || normalized.includes('beauty')) {
    return { icon: Scissors, bg: palette.rose100, color: palette.rose600, label: 'Salon' };
  }

  return { icon: HelpCircle, bg: colors.canvasGray, color: colors.textMuted, label: 'Handyman' };
};

export const WorkerMarkerBadge: FC<WorkerMarkerBadgeProps> = ({
  category,
  size = 18,
}) => {
  const meta = getCategoryMeta(category);
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

const styles = StyleSheet.create({
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
