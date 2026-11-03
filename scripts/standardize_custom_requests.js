const fs = require('fs');
const path = require('path');

const files = [
  'app/custom-request/new.tsx',
  'app/custom-request/[id]/index.tsx',
  'app/custom-request/[id]/quote.tsx',
  'app/custom-request/[id]/checkout.tsx',
  'app/chat/request/[requestId].tsx',
  'src/components/custom-requests/CustomRequestCard.tsx',
  'src/components/custom-requests/DeclineQuoteModal.tsx',
  'src/components/custom-requests/QuoteBreakdownCard.tsx',
  'src/components/custom-requests/QuoteExpiryCountdown.tsx',
];

files.forEach(relPath => {
  const filePath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(filePath)) {
    console.log('File not found:', relPath);
    return;
  }
  let content = fs.readFileSync(filePath, 'utf8');

  // Ensure design token imports exist
  const importDepth = relPath.startsWith('app/custom-request/[id]') ? '../../../src/design'
    : relPath.startsWith('app/chat/request') ? '../../../src/design'
    : relPath.startsWith('app/custom-request') ? '../../src/design'
    : '../../design';

  if (!content.includes('colors') || !content.includes('palette')) {
    if (content.includes("from '" + importDepth + "'") || content.includes('from "' + importDepth + '"')) {
      content = content.replace(new RegExp(`import \\{([^}]+)\\} from ['"]${importDepth}['"]`), (match, p1) => {
        const tokens = p1.split(',').map(t => t.trim());
        if (!tokens.includes('colors')) tokens.push('colors');
        if (!tokens.includes('palette')) tokens.push('palette');
        return `import { ${tokens.join(', ')} } from '${importDepth}'`;
      });
    } else {
      // Add import at top after React imports
      content = `import { colors, palette } from '${importDepth}';\n` + content;
    }
  }

  // JSX attribute replacements
  content = content.replace(/color=\"#FFFFFF\"/g, 'color={colors.white}');
  content = content.replace(/color=\"#15803D\"/g, 'color={colors.textGreen}');
  content = content.replace(/color=\"#16A34A\"/g, 'color={colors.primaryDark}');
  content = content.replace(/color=\"#166534\"/g, 'color={colors.textGreenDark}');
  content = content.replace(/color=\"#DC2626\"/g, 'color={colors.dangerMedium}');
  content = content.replace(/color=\"#D97706\"/g, 'color={colors.warningMedium}');
  content = content.replace(/color=\"#2563EB\"/g, 'color={colors.textInfo}');
  content = content.replace(/color=\"#7C3AED\"/g, 'color={palette.purple600}');
  content = content.replace(/color=\"#6B7280\"/g, 'color={colors.textSecondary}');
  content = content.replace(/color=\"#EAB308\"/g, 'color={colors.starFilled}');
  content = content.replace(/fill=\"#EAB308\"/g, 'fill={colors.starFilled}');
  content = content.replace(/color=\"#F59E0B\"/g, 'color={colors.warning}');
  content = content.replace(/fill=\"#F59E0B\"/g, 'fill={colors.warning}');
  content = content.replace(/color=\"#9CA3AF\"/g, 'color={colors.textMuted}');
  content = content.replace(/placeholderTextColor=\"#9CA3AF\"/g, 'placeholderTextColor={colors.textMuted}');
  content = content.replace(/placeholderTextColor=\"#D1D5DB\"/g, 'placeholderTextColor={colors.textDisabled}');

  // Object property replacements
  const replacements = [
    // Backgrounds
    [/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard'],
    [/backgroundColor:\s*'#FAFAFA'/g, 'backgroundColor: colors.bgApp'],
    [/backgroundColor:\s*'#F9FAFB'/g, 'backgroundColor: colors.bgSubtle'],
    [/backgroundColor:\s*'#F8FAFC'/g, 'backgroundColor: colors.bgSubtle'],
    [/backgroundColor:\s*'#F3F4F6'/g, 'backgroundColor: colors.bgHover'],
    [/backgroundColor:\s*'#DCFCE7'/g, 'backgroundColor: colors.primaryBorderSubtle'],
    [/backgroundColor:\s*'#F0FDF4'/g, 'backgroundColor: colors.primaryTint'],
    [/backgroundColor:\s*'#FEF2F2'/g, 'backgroundColor: colors.dangerLight'],
    [/backgroundColor:\s*'#FEE2E2'/g, 'backgroundColor: colors.borderErrorLight'],
    [/backgroundColor:\s*'#FEF3C7'/g, 'backgroundColor: colors.warningLight'],
    [/backgroundColor:\s*'#FFFBEB'/g, 'backgroundColor: palette.amber50'],
    [/backgroundColor:\s*'#EFF6FF'/g, 'backgroundColor: colors.infoLight'],
    [/backgroundColor:\s*'#FAF5FF'/g, 'backgroundColor: palette.purple50'],
    [/backgroundColor:\s*'#15803D'/g, 'backgroundColor: colors.textGreen'],
    [/backgroundColor:\s*'#16A34A'/g, 'backgroundColor: colors.primaryDark'],

    // Borders
    [/borderBottomColor:\s*'#E5E7EB'/g, 'borderBottomColor: colors.border'],
    [/borderBottomColor:\s*'#86EFAC'/g, 'borderBottomColor: colors.primaryBorder'],
    [/borderTopColor:\s*'#E5E7EB'/g, 'borderTopColor: colors.border'],
    [/borderColor:\s*'#E5E7EB'/g, 'borderColor: colors.border'],
    [/borderColor:\s*'#D1D5DB'/g, 'borderColor: colors.borderStrong'],
    [/borderColor:\s*'#BBF7D0'/g, 'borderColor: colors.primaryBorder'],
    [/borderColor:\s*'#86EFAC'/g, 'borderColor: colors.primaryBorder'],
    [/borderColor:\s*'#FDE68A'/g, 'borderColor: colors.warningBorder'],
    [/borderColor:\s*'#FECACA'/g, 'borderColor: colors.borderErrorLight'],
    [/borderColor:\s*'#BFDBFE'/g, 'borderColor: colors.borderInfoLight'],
    [/borderColor:\s*'#E9D5FF'/g, 'borderColor: palette.purple200'],

    // Text & generic colors
    [/color:\s*'#FFFFFF'/g, 'color: colors.white'],
    [/color:\s*'#15803D'/g, 'color: colors.textGreen'],
    [/color:\s*'#166534'/g, 'color: colors.textGreenDark'],
    [/color:\s*'#16A34A'/g, 'color: colors.primaryDark'],
    [/color:\s*'#111827'/g, 'color: colors.textPrimary'],
    [/color:\s*'#6B7280'/g, 'color: colors.textSecondary'],
    [/color:\s*'#4B5563'/g, 'color: colors.textSecondary'],
    [/color:\s*'#D97706'/g, 'color: colors.warningMedium'],
    [/color:\s*'#B45309'/g, 'color: colors.textWarningMedium'],
    [/color:\s*'#92400E'/g, 'color: colors.textWarning'],
    [/color:\s*'#DC2626'/g, 'color: colors.dangerMedium'],
    [/color:\s*'#B91C1C'/g, 'color: palette.red700'],
    [/color:\s*'#2563EB'/g, 'color: colors.textInfo'],
    [/color:\s*'#1D4ED8'/g, 'color: palette.blue700'],
    [/color:\s*'#7C3AED'/g, 'color: palette.purple600'],
    [/color:\s*'#6D28D9'/g, 'color: palette.purple700'],
    [/color:\s*'#D1D5DB'/g, 'color: colors.textDisabled'],
    [/shadowColor:\s*'#000000'/g, 'shadowColor: colors.shadow'],
    [/shadowColor:\s*'#000'/g, 'shadowColor: colors.shadow'],
  ];

  replacements.forEach(([regex, repl]) => {
    content = content.replace(regex, repl);
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Standardized:', relPath);
});
