import React, { useMemo } from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { fontFamily } from '../../design';
import type { AppTheme } from '../../design/themes';
import type { InvoiceView, InvoiceStatus } from '../../utils/invoiceView';

export interface InvoiceDocumentProps {
  view: InvoiceView;
  /** Passed explicitly: the screen uses the app theme, the image export always prints light. */
  theme: AppTheme;
  style?: StyleProp<ViewStyle>;
}

/**
 * The invoice as one document: header, parties, services, summary, payment.
 * Flat surface, three hairlines, tabular figures. Shared by the screen and the image export.
 */
export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ view, theme, style }) => {
  const s = useMemo(() => createStyles(theme), [theme]);
  const tone = statusTone(view.status, theme);

  return (
    <View style={[s.doc, style]} collapsable={false}>
      {/* A. Header */}
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <Text style={s.brand} allowFontScaling={false}>TaskLync</Text>
          <Text style={s.docTitle}>Service Invoice</Text>
        </View>
        <View style={[s.statusPill, { backgroundColor: tone.bg }]} accessibilityLabel={`Status: ${view.statusLabel}`}>
          <Text style={[s.statusText, { color: tone.fg }]}>{view.statusLabel.toUpperCase()}</Text>
        </View>
      </View>

      <View style={s.metaRow}>
        <View style={s.metaCol}>
          <Text style={s.label}>Invoice no.</Text>
          <Text style={s.metaValue} selectable>{view.invoiceNumber}</Text>
        </View>
        <View style={[s.metaCol, s.alignEnd]}>
          <Text style={s.label}>Issue date</Text>
          <Text style={s.metaValue}>{view.issuedDate}</Text>
        </View>
      </View>

      <View style={s.rule} />

      {/* B. Parties */}
      <View style={s.partiesRow}>
        <View style={s.partyCol}>
          <Text style={s.label}>Billed to</Text>
          {view.customerName ? <Text style={s.partyName}>{view.customerName}</Text> : null}
          {view.customerAddress ? <Text style={s.partyDetail}>{view.customerAddress}</Text> : null}
        </View>
        <View style={s.partyCol}>
          <Text style={s.label}>Service provider</Text>
          {view.providerName ? <Text style={s.partyName}>{view.providerName}</Text> : null}
          {view.providerCategory ? <Text style={s.partyDetail}>{view.providerCategory}</Text> : null}
          {view.providerTaxId ? <Text style={s.partyDetail}>Tax ID {view.providerTaxId}</Text> : null}
        </View>
      </View>

      <View style={s.rule} />

      {/* C. Services */}
      <View style={s.sectionHead}>
        <Text style={s.label}>{view.isCustomQuote ? 'Custom service' : 'Services'}</Text>
        {view.serviceCategory ? <Text style={s.categoryTag}>{view.serviceCategory}</Text> : null}
      </View>
      <View style={s.lines}>
        {view.lines.map((line) => (
          <View key={line.id} style={s.lineRow}>
            <View style={s.lineText}>
              <Text style={s.lineName}>{line.name}</Text>
              {line.detail ? <Text style={s.lineDetail}>{line.detail}</Text> : null}
            </View>
            <Text style={s.lineAmount}>{line.amount}</Text>
          </View>
        ))}
      </View>

      {/* D. Summary */}
      <View style={s.summary}>
        {view.summary.map((row) => (
          <View key={row.key} style={s.summaryRow}>
            <Text style={s.summaryLabel}>{row.label}</Text>
            <Text style={[s.summaryValue, row.kind === 'discount' && { color: theme.colors.primaryDark }]}>{row.value}</Text>
          </View>
        ))}
      </View>
      <View style={s.totalRow} accessible accessibilityLabel={`${view.totalLabel} ${view.total}`}>
        <Text style={s.totalLabel}>{view.totalLabel}</Text>
        <Text style={s.totalValue}>{view.total}</Text>
      </View>

      <View style={s.rule} />

      {/* E. Payment */}
      <Text style={s.label}>Payment method</Text>
      <Text style={s.partyName}>{view.paymentMethod}</Text>
      {view.paymentNote ? <Text style={s.partyDetail}>{view.paymentNote}</Text> : null}
      {view.paymentReference ? (
        <Text style={s.partyDetail} selectable>Ref. {view.paymentReference}</Text>
      ) : null}
    </View>
  );
};

function statusTone(status: InvoiceStatus, { colors, palette, isDark }: AppTheme) {
  if (status === 'PAID') return { fg: colors.primaryDark, bg: isDark ? palette.green100 : colors.primaryLight };
  // amber700 / amber100 are themed: dark brown-on-cream in light mode, amber-on-deep-brown in dark mode.
  if (status === 'PENDING') return { fg: palette.amber700, bg: palette.amber100 };
  return { fg: colors.textSecondary, bg: colors.bgSection };
}

const NUM = { fontVariant: ['tabular-nums' as const] };

const createStyles = ({ colors }: AppTheme) =>
  StyleSheet.create({
    doc: {
      backgroundColor: colors.bgCard,
      paddingHorizontal: 20,
      paddingVertical: 24,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerLeft: {
      flexShrink: 1,
    },
    brand: {
      fontFamily: fontFamily.poppins.semiBold,
      fontSize: 15,
      lineHeight: 20,
      color: colors.primaryDark,
      letterSpacing: -0.1,
    },
    docTitle: {
      fontFamily: fontFamily.poppins.semiBold,
      fontSize: 22,
      lineHeight: 30,
      color: colors.textPrimary,
      marginTop: 2,
    },
    statusPill: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginTop: 2,
    },
    statusText: {
      fontFamily: fontFamily.inter.semiBold,
      fontSize: 11,
      letterSpacing: 0.6,
    },
    metaRow: {
      flexDirection: 'row',
      marginTop: 20,
      gap: 16,
    },
    metaCol: {
      flex: 1,
    },
    alignEnd: {
      alignItems: 'flex-end',
    },
    label: {
      fontFamily: fontFamily.jakarta.medium,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textMuted,
      marginBottom: 4,
    },
    metaValue: {
      fontFamily: fontFamily.inter.medium,
      fontSize: 14,
      lineHeight: 20,
      color: colors.textPrimary,
      ...NUM,
    },
    rule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: 20,
    },
    partiesRow: {
      flexDirection: 'row',
      gap: 20,
    },
    partyCol: {
      flex: 1,
      minWidth: 0,
    },
    partyName: {
      fontFamily: fontFamily.jakarta.semiBold,
      fontSize: 14.5,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    partyDetail: {
      fontFamily: fontFamily.jakarta.regular,
      fontSize: 13,
      lineHeight: 19,
      color: colors.textSecondary,
      marginTop: 2,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 12,
    },
    categoryTag: {
      fontFamily: fontFamily.jakarta.medium,
      fontSize: 12,
      lineHeight: 16,
      color: colors.textSecondary,
      marginBottom: 4,
      flexShrink: 1,
      textAlign: 'right',
    },
    lines: {
      marginTop: 6,
      gap: 12,
    },
    lineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 16,
    },
    lineText: {
      flex: 1,
      minWidth: 0,
    },
    lineName: {
      fontFamily: fontFamily.jakarta.medium,
      fontSize: 14.5,
      lineHeight: 20,
      color: colors.textPrimary,
    },
    lineDetail: {
      fontFamily: fontFamily.inter.regular,
      fontSize: 12.5,
      lineHeight: 17,
      color: colors.textMuted,
      marginTop: 2,
      ...NUM,
    },
    lineAmount: {
      fontFamily: fontFamily.inter.medium,
      fontSize: 14.5,
      lineHeight: 20,
      color: colors.textPrimary,
      ...NUM,
    },
    summary: {
      marginTop: 20,
      paddingTop: 16,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      gap: 8,
    },
    summaryRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 16,
    },
    summaryLabel: {
      fontFamily: fontFamily.jakarta.regular,
      fontSize: 13.5,
      lineHeight: 19,
      color: colors.textSecondary,
      flexShrink: 1,
    },
    summaryValue: {
      fontFamily: fontFamily.inter.regular,
      fontSize: 13.5,
      lineHeight: 19,
      color: colors.textPrimary,
      ...NUM,
    },
    totalRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginTop: 14,
      gap: 16,
    },
    totalLabel: {
      fontFamily: fontFamily.jakarta.semiBold,
      fontSize: 15,
      lineHeight: 22,
      color: colors.textPrimary,
    },
    totalValue: {
      fontFamily: fontFamily.inter.semiBold,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.3,
      color: colors.textPrimary,
      ...NUM,
    },
  });
