import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { BottomSheet } from '../layout/BottomSheet';
import { fontFamily } from '../../design/typography';
import { formatRs } from '../../utils/offers';
import { selectionProblem, selectionSubtotal, type BookableService } from '../../utils/bookNow';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';

interface BookNowServiceSheetProps {
  visible: boolean;
  workerName: string;
  services: BookableService[];
  /** The customer's chosen services, in the order the list shows them. */
  onConfirm: (services: BookableService[]) => void;
  onClose: () => void;
}

const duration = (mins: number | null): string | null => {
  if (!mins || mins <= 0) return null;
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} ${h === 1 ? 'hr' : 'hrs'}`;
};

/** "What do you need?" - tick one or more services, then Continue to scheduling. */
export const BookNowServiceSheet: React.FC<BookNowServiceSheetProps> = ({
  visible,
  workerName,
  services,
  onConfirm,
  onClose,
}) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // a fresh choice every time the sheet opens
  useEffect(() => {
    if (visible) setSelectedIds([]);
  }, [visible]);

  const selected = useMemo(
    () => services.filter((s) => selectedIds.includes(s.cartServiceId)),
    [services, selectedIds]
  );
  const problem = selectionProblem(selected);
  const canContinue = selected.length > 0 && problem === null;

  const toggle = (id: string) =>
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Text style={styles.title}>What do you need?</Text>
      <Text style={styles.subtitle}>
        Select one or more services{workerName ? ` from ${workerName}` : ''}.
      </Text>

      <View style={styles.list}>
        {services.map((s) => {
          const isOn = selectedIds.includes(s.cartServiceId);
          const meta = duration(s.durationMins);
          return (
            <Pressable
              key={s.cartServiceId}
              onPress={() => toggle(s.cartServiceId)}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isOn }}
              accessibilityLabel={`${s.name}, ${formatRs(s.price)}${s.priceType === 'hourly' ? ' per hour' : ''}`}
            >
              <View style={[styles.box, isOn && styles.boxOn]}>
                {isOn ? <Check size={14} color={colors.pureWhite} strokeWidth={3} /> : null}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={2}>{s.name}</Text>
                {meta ? <Text style={styles.meta}>{meta}</Text> : null}
              </View>
              <Text style={styles.price}>
                {formatRs(s.price)}
                {s.priceType === 'hourly' ? <Text style={styles.unit}> /hr</Text> : null}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {problem ? (
        <Text style={styles.problem} accessibilityLiveRegion="polite">{problem}</Text>
      ) : null}

      <Pressable
        onPress={() => canContinue && onConfirm(selected)}
        disabled={!canContinue}
        style={({ pressed }) => [styles.cta, !canContinue && styles.ctaDisabled, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canContinue }}
        accessibilityLabel={canContinue ? `Continue with ${selected.length} selected` : 'Select a service to continue'}
      >
        <Text style={styles.ctaText}>
          {selected.length === 0
            ? 'Select a service'
            : `Continue · ${selected.length} selected · ${formatRs(selectionSubtotal(selected))}`}
        </Text>
      </Pressable>
    </BottomSheet>
  );
};

const createStyles = ({ colors }: AppTheme) => StyleSheet.create({
  title: {
    fontFamily: fontFamily.poppins.semiBold,
    fontSize: 18,
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  list: {
    marginTop: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  pressed: { opacity: 0.6 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgCard,
  },
  boxOn: {
    backgroundColor: colors.primaryDark,
    borderColor: colors.primaryDark,
  },
  rowText: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: fontFamily.jakarta.semiBold,
    fontSize: 15,
    color: colors.textPrimary,
  },
  meta: {
    marginTop: 2,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  price: {
    fontFamily: fontFamily.inter.semiBold,
    fontSize: 14.5,
    color: colors.textPrimary,
  },
  unit: {
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12,
    color: colors.textMuted,
  },
  problem: {
    marginTop: 10,
    fontFamily: fontFamily.jakarta.regular,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.danger,
  },
  cta: {
    marginTop: 16,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryDark,
  },
  ctaDisabled: {
    backgroundColor: colors.textDisabled,
  },
  ctaText: {
    fontFamily: fontFamily.jakarta.bold,
    fontSize: 15.5,
    color: colors.pureWhite,
  },
});
