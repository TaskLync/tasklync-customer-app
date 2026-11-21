import React from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { BottomSheet } from '../layout/BottomSheet';
import { CheckIcon, DocumentIcon, ImageIcon } from '../ui/Icon/icons';
import { fontFamily } from '../../design';
import { useAppTheme, useThemedStyles, type AppTheme } from '../../theme/useAppTheme';
import type { InvoiceExportFormat, InvoiceExportState } from '../../hooks/useInvoiceExport';

export interface InvoiceDownloadSheetProps {
  visible: boolean;
  state: InvoiceExportState;
  onSelect: (format: InvoiceExportFormat) => void;
  /** Called once the sheet has fully closed (animation finished, modal unmounted). */
  onClosed: () => void;
}

const OPTIONS: { format: InvoiceExportFormat; title: string; subtitle: string }[] = [
  { format: 'pdf', title: 'PDF Document', subtitle: 'Best for printing and records' },
  { format: 'image', title: 'Image', subtitle: 'Save or share your invoice as an image' },
];

/**
 * "Download invoice" on the app's shared BottomSheet in auto-height mode: the sheet measures this
 * content (safe-area padding included) and opens at exactly that height, so both rows are always
 * fully visible. Drag down or tap outside to close, except while a file is being prepared.
 */
export const InvoiceDownloadSheet: React.FC<InvoiceDownloadSheetProps> = ({ visible, state, onSelect, onClosed }) => {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const working = state.status === 'working';

  return (
    <BottomSheet
      visible={visible}
      onClose={onClosed}
      snapPoints={['auto']}
      contentPadding={false}
      closeOnBackdropPress={!working}
      enablePanDownToClose={!working}
    >
      <View style={styles.content}>
        <Text style={styles.title} accessibilityRole="header">Download invoice</Text>

        {OPTIONS.map((opt, i) => {
          const isThis = state.status !== 'idle' && state.format === opt.format;
          const rowWorking = isThis && state.status === 'working';
          const rowError = isThis && state.status === 'error' ? state.message : null;
          const rowDone = isThis && state.status === 'done';
          const Icon = opt.format === 'pdf' ? DocumentIcon : ImageIcon;

          return (
            <View key={opt.format}>
              {i > 0 ? <View style={styles.separator} /> : null}
              <Pressable
                onPress={() => onSelect(opt.format)}
                disabled={working}
                android_ripple={{ color: colors.bgHover }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                  working && !rowWorking && styles.rowDimmed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Download as ${opt.title}`}
                accessibilityHint={opt.subtitle}
                accessibilityState={{ busy: rowWorking, disabled: working }}
              >
                <View style={styles.iconBox}>
                  <Icon size={20} color={colors.textPrimary} />
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{opt.title}</Text>
                  <Text style={[styles.rowSub, rowError ? styles.rowError : null]} numberOfLines={2}>
                    {rowError ?? (rowWorking ? 'Preparing…' : opt.subtitle)}
                  </Text>
                </View>
                <View style={styles.trailing}>
                  {rowWorking ? (
                    <ActivityIndicator size="small" color={colors.textSecondary} />
                  ) : rowDone ? (
                    <CheckIcon size={18} color={colors.primaryDark} />
                  ) : null}
                </View>
              </Pressable>
            </View>
          );
        })}
      </View>
    </BottomSheet>
  );
};

const ICON_BOX = 40;
const ROW_PAD_X = 20;

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    content: {
      paddingTop: 4,
    },
    title: {
      fontFamily: fontFamily.poppins.semiBold,
      fontSize: 17,
      lineHeight: 24,
      color: colors.textPrimary,
      paddingHorizontal: ROW_PAD_X,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 68,
      paddingHorizontal: ROW_PAD_X,
      paddingVertical: 12,
      gap: 14,
    },
    rowPressed: {
      backgroundColor: colors.bgHover,
    },
    rowDimmed: {
      opacity: 0.4,
    },
    // Inset to start under the text, as in native list rows.
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: ROW_PAD_X + ICON_BOX + 14,
      marginRight: ROW_PAD_X,
    },
    iconBox: {
      width: ICON_BOX,
      height: ICON_BOX,
      borderRadius: 10,
      backgroundColor: colors.bgSection,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
      minWidth: 0,
    },
    rowTitle: {
      fontFamily: fontFamily.jakarta.semiBold,
      fontSize: 15,
      lineHeight: 21,
      color: colors.textPrimary,
    },
    rowSub: {
      fontFamily: fontFamily.jakarta.regular,
      fontSize: 13,
      lineHeight: 18,
      color: colors.textSecondary,
      marginTop: 1,
    },
    rowError: {
      color: colors.textDanger,
    },
    trailing: {
      width: 24,
      alignItems: 'center',
    },
  });
