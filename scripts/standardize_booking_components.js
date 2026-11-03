const fs = require('fs');
const path = require('path');

const bookingFiles = [
  'src/components/booking/DispatchedTechnicianCard.tsx',
  'src/components/booking/BookingDisputeCard.tsx',
  'src/components/booking/BookingWorkerRow.tsx',
  'src/components/booking/BookingActions.tsx',
  'src/components/booking/BookingCardSkeleton.tsx',
  'src/components/booking/TechnicianReassignedBanner.tsx',
  'src/components/booking/BookingCountdown.tsx',
  'src/components/booking/summary/SummaryWorkerRow.tsx',
  'src/components/booking/BookingHistoryCard.tsx',
  'src/components/booking/BookingsTabBar.tsx',
  'src/components/booking/BookingCard.tsx',
  'src/components/booking/BookingList.tsx',
  'src/components/booking/DisputeEvidenceSlot.tsx',
  'src/components/booking/DisputeInfoBanner.tsx',
  'src/components/booking/BookingsHeader.tsx',
  'src/components/booking/BookingServiceMeta.tsx',
  'src/components/booking/BookingStatusBadge.tsx',
  'src/components/booking/BookingPriceTag.tsx',
  'src/components/booking/BookingsTabIndicator.tsx',
  'src/components/booking/BookingStatusDot.tsx',
  'src/components/booking/RefundPolicyNotice.tsx',
  'src/components/booking/success/SuccessSubtitle.tsx',
];

bookingFiles.forEach(relPath => {
  const filePath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  const depth = relPath.includes('summary/') || relPath.includes('success/') ? '../../../design' : '../../design';

  if (!content.includes('colors') || !content.includes('palette')) {
    if (content.includes("from '" + depth) || content.includes('from "' + depth)) {
      content = content.replace(new RegExp(`import \\{([^}]+)\\} from ['"]${depth}['"]`), (match, p1) => {
        const tokens = p1.split(',').map(t => t.trim());
        if (!tokens.includes('colors')) tokens.push('colors');
        if (!tokens.includes('palette')) tokens.push('palette');
        return `import { ${tokens.join(', ')} } from '${depth}'`;
      });
    } else {
      content = `import { colors, palette } from '${depth}';\n` + content;
    }
  }

  // Common JSX colors
  content = content.replace(/color=\"#FFFFFF\"/g, 'color={colors.white}');
  content = content.replace(/color=\"#15803D\"/g, 'color={colors.textGreen}');
  content = content.replace(/color=\"#16A34A\"/g, 'color={colors.primaryDark}');
  content = content.replace(/color=\"#2563EB\"/g, 'color={colors.textInfo}');
  content = content.replace(/color=\"#3B82F6\"/g, 'color={colors.info}');
  content = content.replace(/color=\"#DC2626\"/g, 'color={colors.dangerMedium}');
  content = content.replace(/color=\"#EF4444\"/g, 'color={colors.danger}');
  content = content.replace(/color=\"#D97706\"/g, 'color={colors.warningMedium}');
  content = content.replace(/color=\"#F59E0B\"/g, 'color={colors.warning}');
  content = content.replace(/fill=\"#F59E0B\"/g, 'fill={colors.warning}');
  content = content.replace(/color=\"#64748B\"/g, 'color={colors.textSecondary}');
  content = content.replace(/color=\"#475569\"/g, 'color={colors.textSecondary}');
  content = content.replace(/color=\"#0F172A\"/g, 'color={colors.textPrimary}');
  content = content.replace(/color=\"#94A3B8\"/g, 'color={colors.textMuted}');
  content = content.replace(/color=\"#CBD5E1\"/g, 'color={colors.textDisabled}');
  content = content.replace(/color=\"#92400E\"/g, 'color={colors.textWarning}');

  // Common styles
  const reps = [
    [/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard'],
    [/backgroundColor:\s*'#F8FAFC'/g, 'backgroundColor: colors.bgSubtle'],
    [/backgroundColor:\s*'#F1F5F9'/g, 'backgroundColor: colors.bgHover'],
    [/backgroundColor:\s*'#F3F4F6'/g, 'backgroundColor: colors.bgHover'],
    [/backgroundColor:\s*'#F0FDF4'/g, 'backgroundColor: colors.primaryTint'],
    [/backgroundColor:\s*'#DCFCE7'/g, 'backgroundColor: colors.primaryBorderSubtle'],
    [/backgroundColor:\s*'#FEF2F2'/g, 'backgroundColor: colors.dangerLight'],
    [/backgroundColor:\s*'#FEE2E2'/g, 'backgroundColor: colors.borderErrorLight'],
    [/backgroundColor:\s*'#FEF3C7'/g, 'backgroundColor: colors.warningLight'],
    [/backgroundColor:\s*'#EFF6FF'/g, 'backgroundColor: colors.infoLight'],
    [/backgroundColor:\s*'#DBEAFE'/g, 'backgroundColor: palette.blue100'],
    [/backgroundColor:\s*'#16A34A'/g, 'backgroundColor: colors.primaryDark'],
    [/backgroundColor:\s*'#2563EB'/g, 'backgroundColor: colors.infoMedium'],
    [/backgroundColor:\s*'#DC2626'/g, 'backgroundColor: colors.dangerMedium'],
    [/backgroundColor:\s*'#E2E8F0'/g, 'backgroundColor: colors.border'],

    [/borderColor:\s*'#E2E8F0'/g, 'borderColor: colors.border'],
    [/borderColor:\s*'#EDF2F7'/g, 'borderColor: colors.borderLight'],
    [/borderColor:\s*'#F1F5F9'/g, 'borderColor: colors.borderLight'],
    [/borderColor:\s*'#BBF7D0'/g, 'borderColor: colors.primaryBorder'],
    [/borderColor:\s*'#DCFCE7'/g, 'borderColor: colors.primaryBorderSubtle'],
    [/borderColor:\s*'#FDE68A'/g, 'borderColor: colors.warningBorder'],
    [/borderColor:\s*'#FECACA'/g, 'borderColor: colors.borderErrorLight'],
    [/borderColor:\s*'#FEE2E2'/g, 'borderColor: colors.borderErrorLight'],
    [/borderColor:\s*'#BFDBFE'/g, 'borderColor: colors.borderInfoLight'],
    [/borderColor:\s*'#DBEAFE'/g, 'borderColor: colors.borderInfoLight'],
    [/borderColor:\s*'#16A34A'/g, 'borderColor: colors.primaryDark'],
    [/borderColor:\s*'#2563EB'/g, 'borderColor: colors.infoMedium'],
    [/borderColor:\s*'#CBD5E1'/g, 'borderColor: colors.borderStrong'],
    [/borderBottomColor:\s*'#E2E8F0'/g, 'borderBottomColor: colors.border'],
    [/borderBottomColor:\s*'#F1F5F9'/g, 'borderBottomColor: colors.borderLight'],
    [/borderTopColor:\s*'#F1F5F9'/g, 'borderTopColor: colors.borderLight'],

    [/color:\s*'#0F172A'/g, 'color: colors.textPrimary'],
    [/color:\s*'#64748B'/g, 'color: colors.textSecondary'],
    [/color:\s*'#475569'/g, 'color: colors.textSecondary'],
    [/color:\s*'#334155'/g, 'color: colors.textSecondary'],
    [/color:\s*'#94A3B8'/g, 'color: colors.textMuted'],
    [/color:\s*'#CBD5E1'/g, 'color: colors.textDisabled'],
    [/color:\s*'#15803D'/g, 'color: colors.textGreen'],
    [/color:\s*'#16A34A'/g, 'color: colors.primaryDark'],
    [/color:\s*'#2563EB'/g, 'color: colors.textInfo'],
    [/color:\s*'#1D4ED8'/g, 'color: colors.textInfoDark'],
    [/color:\s*'#D97706'/g, 'color: colors.warningMedium'],
    [/color:\s*'#B45309'/g, 'color: colors.textWarningMedium'],
    [/color:\s*'#92400E'/g, 'color: colors.textWarning'],
    [/color:\s*'#DC2626'/g, 'color: colors.dangerMedium'],
    [/color:\s*'#EF4444'/g, 'color: colors.danger'],
    [/color:\s*'#FFFFFF'/g, 'color: colors.white'],
    [/shadowColor:\s*'#0F172A'/g, 'shadowColor: colors.shadow'],
    [/shadowColor:\s*'#000000'/g, 'shadowColor: colors.shadow'],
    [/shadowColor:\s*'#000'/g, 'shadowColor: colors.shadow'],
  ];

  reps.forEach(([pattern, repl]) => {
    content = content.replace(pattern, repl);
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Standardized booking file:', relPath);
});
