const fs = require('fs');
const path = require('path');

const files = [
  'src/components/feedback/InAppBanner.tsx',
  'src/components/feedback/ConnectionBanner.tsx',
  'src/components/feedback/OfflineBanner.tsx',
  'src/components/feedback/DeleteAccountConfirmStep.tsx',
  'src/components/feedback/Toast/Toast.tsx',
  'src/components/feedback/SyncIndicator.tsx',
  'src/components/address/AddressLabelChips.tsx',
  'src/components/address/AddressConfirmSheet.tsx',
  'src/components/address/AddressNotesInput.tsx',
  'src/components/address/MiniMapPreview.tsx',
  'src/components/address/AddressList.tsx',
];

files.forEach(relPath => {
  const filePath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  const depth = relPath.includes('Toast/') ? '../../../design' : '../../design';

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

  // Common replacements
  content = content.replace(/color=\"#FFFFFF\"/g, 'color={colors.white}');
  content = content.replace(/color=\"#16A34A\"/g, 'color={colors.primaryDark}');
  content = content.replace(/color=\"#15803D\"/g, 'color={colors.textGreen}');
  content = content.replace(/color=\"#2563EB\"/g, 'color={colors.textInfo}');
  content = content.replace(/color=\"#D97706\"/g, 'color={colors.warningMedium}');
  content = content.replace(/color=\"#EAB308\"/g, 'color={colors.starFilled}');
  content = content.replace(/color=\"#9333EA\"/g, 'color={palette.purple600}');
  content = content.replace(/color=\"#0F172A\"/g, 'color={colors.textPrimary}');
  content = content.replace(/color=\"#94A3B8\"/g, 'color={colors.textMuted}');
  content = content.replace(/color=\"#475569\"/g, 'color={colors.textSecondary}');
  content = content.replace(/color=\"#64748B\"/g, 'color={colors.textSecondary}');
  content = content.replace(/color=\"#334155\"/g, 'color={colors.textSecondary}');

  const reps = [
    [/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard'],
    [/backgroundColor:\s*'#F8FAFC'/g, 'backgroundColor: colors.bgSubtle'],
    [/backgroundColor:\s*'#F1F5F9'/g, 'backgroundColor: colors.bgHover'],
    [/backgroundColor:\s*'#F3F4F6'/g, 'backgroundColor: colors.bgHover'],
    [/backgroundColor:\s*'#DCFCE7'/g, 'backgroundColor: colors.primaryBorderSubtle'],
    [/backgroundColor:\s*'#F0FDF4'/g, 'backgroundColor: colors.primaryTint'],
    [/backgroundColor:\s*'#FEF2F2'/g, 'backgroundColor: colors.dangerLight'],
    [/backgroundColor:\s*'#FEF3C7'/g, 'backgroundColor: colors.warningLight'],
    [/backgroundColor:\s*'#16A34A'/g, 'backgroundColor: colors.primaryDark'],
    [/backgroundColor:\s*'#D97706'/g, 'backgroundColor: colors.warningMedium'],
    [/backgroundColor:\s*'#334155'/g, 'backgroundColor: palette.gray700'],
    [/backgroundColor:\s*'#0F172A'/g, 'backgroundColor: palette.gray900'],

    [/borderColor:\s*'#E2E8F0'/g, 'borderColor: colors.border'],
    [/borderColor:\s*'#F1F5F9'/g, 'borderColor: colors.borderLight'],
    [/borderColor:\s*'#FDE68A'/g, 'borderColor: colors.warningBorder'],
    [/borderColor:\s*'#BBF7D0'/g, 'borderColor: colors.primaryBorder'],
    [/borderColor:\s*'#FEE2E2'/g, 'borderColor: colors.borderErrorLight'],
    [/borderColor:\s*'#DCFCE7'/g, 'borderColor: colors.primaryBorderSubtle'],
    [/borderColor:\s*'#FEF3C7'/g, 'borderColor: colors.warningLight'],
    [/borderColor:\s*'#DBEAFE'/g, 'borderColor: colors.borderInfoLight'],
    [/borderColor:\s*'#334155'/g, 'borderColor: palette.gray700'],
    [/borderColor:\s*'#475569'/g, 'borderColor: palette.gray600'],
    [/borderColor:\s*'#4ADE80'/g, 'borderColor: palette.green400'],
    [/borderBottomColor:\s*'#FDE68A'/g, 'borderBottomColor: colors.warningBorder'],

    [/color:\s*'#0F172A'/g, 'color: colors.textPrimary'],
    [/color:\s*'#94A3B8'/g, 'color: colors.textMuted'],
    [/color:\s*'#475569'/g, 'color: colors.textSecondary'],
    [/color:\s*'#64748B'/g, 'color: colors.textSecondary'],
    [/color:\s*'#92400E'/g, 'color: colors.textWarning'],
    [/color:\s*'#15803D'/g, 'color: colors.textGreen'],
    [/color:\s*'#CBD5E1'/g, 'color: colors.textDisabled'],
    [/color:\s*'#4ADE80'/g, 'color: palette.green400'],
    [/color:\s*'#F8FAFC'/g, 'color: palette.gray50'],
    [/color:\s*'#FFFFFF'/g, 'color: colors.white'],
    [/shadowColor:\s*'#000000'/g, 'shadowColor: colors.shadow'],
    [/shadowColor:\s*'#000'/g, 'shadowColor: colors.shadow'],
  ];

  reps.forEach(([pat, rep]) => {
    content = content.replace(pat, rep);
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Standardized:', relPath);
});
