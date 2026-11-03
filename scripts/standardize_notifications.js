const fs = require('fs');
const path = require('path');

// 1. app/notifications/index.tsx
let notifIdx = fs.readFileSync('app/notifications/index.tsx', 'utf8');
if (!notifIdx.includes("import { colors, palette } from '../../src/design';") && !notifIdx.includes("colors, palette")) {
  notifIdx = notifIdx.replace(
    "import { colors } from '../../src/design';",
    "import { colors, palette } from '../../src/design';"
  );
}

notifIdx = notifIdx.replace(/backgroundColor=\"#FFFFFF\"/g, 'backgroundColor={colors.bgCard}');
notifIdx = notifIdx.replace(/color=\"#0F172A\"/g, 'color={colors.textPrimary}');
notifIdx = notifIdx.replace(/color=\"#16A34A\"/g, 'color={colors.primaryDark}');
notifIdx = notifIdx.replace(/color=\"#DC2626\"/g, 'color={colors.dangerMedium}');
notifIdx = notifIdx.replace(/color=\"#94A3B8\"/g, 'color={colors.textMuted}');
notifIdx = notifIdx.replace(/tintColor=\"#16A34A\"/g, 'tintColor={colors.primaryDark}');
notifIdx = notifIdx.replace(/colors=\{\['#16A34A'\]\}/g, 'colors={[colors.primaryDark]}');

notifIdx = notifIdx.replace(/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard');
notifIdx = notifIdx.replace(/borderBottomColor:\s*'#F1F5F9'/g, 'borderBottomColor: colors.borderLight');
notifIdx = notifIdx.replace(/backgroundColor:\s*'#F8FAFC'/g, 'backgroundColor: colors.bgSubtle');
notifIdx = notifIdx.replace(/color:\s*'#0F172A'/g, 'color: colors.textPrimary');
notifIdx = notifIdx.replace(/backgroundColor:\s*'#F0FDF4'/g, 'backgroundColor: colors.primaryTint');
notifIdx = notifIdx.replace(/color:\s*'#16A34A'/g, 'color: colors.primaryDark');
notifIdx = notifIdx.replace(/borderBottomColor:\s*'#E2E8F0'/g, 'borderBottomColor: colors.border');
notifIdx = notifIdx.replace(/backgroundColor:\s*'#F1F5F9'/g, 'backgroundColor: colors.bgHover');
notifIdx = notifIdx.replace(/backgroundColor:\s*'#0F172A'/g, 'backgroundColor: colors.textPrimary');
notifIdx = notifIdx.replace(/color:\s*'#64748B'/g, 'color: colors.textSecondary');
notifIdx = notifIdx.replace(/color:\s*'#FFFFFF'/g, 'color: colors.white');
notifIdx = notifIdx.replace(/backgroundColor:\s*'#FEF2F2'/g, 'backgroundColor: colors.dangerLight');
notifIdx = notifIdx.replace(/borderColor:\s*'#FECACA'/g, 'borderColor: colors.borderErrorLight');
notifIdx = notifIdx.replace(/backgroundColor:\s*'#FEE2E2'/g, 'backgroundColor: colors.borderErrorLight');
notifIdx = notifIdx.replace(/color:\s*'#991B1B'/g, 'color: colors.textDangerDark');
notifIdx = notifIdx.replace(/color:\s*'#B91C1C'/g, 'color: palette.red700');

fs.writeFileSync('app/notifications/index.tsx', notifIdx, 'utf8');
console.log('app/notifications/index.tsx standardized');

// 2. app/notifications/preferences.tsx
let pref = fs.readFileSync('app/notifications/preferences.tsx', 'utf8');
if (!pref.includes("palette")) {
  pref = pref.replace(
    "import { colors } from '../../src/design/colors';",
    "import { colors, palette } from '../../src/design/colors';"
  );
}

pref = pref.replace(/color:\s*'#16A34A'/g, 'color: colors.primaryDark');
pref = pref.replace(/color:\s*'#D97706'/g, 'color: colors.warningMedium');
pref = pref.replace(/color:\s*'#2563EB'/g, 'color: colors.textInfo');
pref = pref.replace(/color:\s*'#CA8A04'/g, 'color: colors.starFilled');
pref = pref.replace(/color:\s*'#475569'/g, 'color: colors.textSecondary');
pref = pref.replace(/color:\s*'#0F172A'/g, 'color: colors.textPrimary');
pref = pref.replace(/color:\s*'#9333EA'/g, 'color: palette.purple600');
pref = pref.replace(/color=\"#0F172A\"/g, 'color={colors.textPrimary}');

pref = pref.replace(/backgroundColor=\"#FFFFFF\"/g, 'backgroundColor={colors.bgCard}');
pref = pref.replace(/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard');
pref = pref.replace(/borderBottomColor:\s*'#F1F5F9'/g, 'borderBottomColor: colors.borderLight');
pref = pref.replace(/backgroundColor:\s*'#F8FAFC'/g, 'backgroundColor: colors.bgSubtle');
pref = pref.replace(/color:\s*'#64748B'/g, 'color: colors.textSecondary');
pref = pref.replace(/borderColor:\s*'#E2E8F0'/g, 'borderColor: colors.border');
pref = pref.replace(/borderTopColor:\s*'#F1F5F9'/g, 'borderTopColor: colors.borderLight');
pref = pref.replace(/color:\s*'#334155'/g, 'color: colors.textSecondary');
pref = pref.replace(/false:\s*'#E2E8F0'/g, 'false: colors.border');
pref = pref.replace(/true:\s*'#16A34A'/g, 'true: colors.primaryDark');
pref = pref.replace(/'#FFFFFF'/g, 'colors.white');

fs.writeFileSync('app/notifications/preferences.tsx', pref, 'utf8');
console.log('app/notifications/preferences.tsx standardized');
