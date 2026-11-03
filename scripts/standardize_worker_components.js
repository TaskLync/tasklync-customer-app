const fs = require('fs');
const path = require('path');

const workerFiles = [
  'src/components/worker/WorkerProfileHeader.tsx',
  'src/components/worker/WorkerProfileStickyFooter.tsx',
  'src/components/worker/WorkerAvailabilityCard.tsx',
  'src/components/worker/WorkerCardHorizontal.tsx',
  'src/components/worker/WorkerStats.tsx',
  'src/components/worker/WorkerServiceRow.tsx',
  'src/components/worker/WorkerCompactHeader.tsx',
  'src/components/worker/BlockWorkerSheet.tsx',
  'src/components/worker/VerifiedBadge.tsx',
  'src/components/worker/WorkerBio.tsx',
  'src/components/worker/WorkerServicesSection.tsx',
  'src/components/worker/WorkerSkillList.tsx',
  'src/components/worker/WorkerPortfolioGrid.tsx',
  'src/components/worker/PortfolioCaption.tsx',
  'src/components/worker/PortfolioCell.tsx',
  'src/components/worker/ProfileHeroGradient.tsx',
  'src/components/worker/UnblockConfirmPopover.tsx',
  'src/components/worker/WorkerSearchCard.tsx',
];

workerFiles.forEach(relPath => {
  const filePath = path.join(process.cwd(), relPath);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');

  const depth = '../../design';

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
  content = content.replace(/color=\"#16A34A\"/g, 'color={colors.primaryDark}');
  content = content.replace(/color=\"#15803D\"/g, 'color={colors.textGreen}');
  content = content.replace(/color=\"#0F172A\"/g, 'color={colors.textPrimary}');
  content = content.replace(/color=\"#64748B\"/g, 'color={colors.textSecondary}');
  content = content.replace(/color=\"#475569\"/g, 'color={colors.textSecondary}');
  content = content.replace(/color=\"#94A3B8\"/g, 'color={colors.textMuted}');
  content = content.replace(/color=\"#F59E0B\"/g, 'color={colors.starFilled}');
  content = content.replace(/fill=\"#F59E0B\"/g, 'fill={colors.starFilled}');
  content = content.replace(/color=\"#EF4444\"/g, 'color={colors.danger}');
  content = content.replace(/color=\"#D97706\"/g, 'color={colors.warningMedium}');
  content = content.replace(/color=\"#4ADE80\"/g, 'color={colors.primaryLight}');

  // Common styles
  const reps = [
    [/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard'],
    [/backgroundColor:\s*'#F8FAFC'/g, 'backgroundColor: colors.bgSubtle'],
    [/backgroundColor:\s*'#F1F5F9'/g, 'backgroundColor: colors.bgHover'],
    [/backgroundColor:\s*'#F3F4F6'/g, 'backgroundColor: colors.bgHover'],
    [/backgroundColor:\s*'#F0FDF4'/g, 'backgroundColor: colors.primaryTint'],
    [/backgroundColor:\s*'#DCFCE7'/g, 'backgroundColor: colors.primaryBorderSubtle'],
    [/backgroundColor:\s*'#FEF2F2'/g, 'backgroundColor: colors.dangerLight'],
    [/backgroundColor:\s*'#FEF3C7'/g, 'backgroundColor: colors.warningLight'],
    [/backgroundColor:\s*'#16A34A'/g, 'backgroundColor: colors.primaryDark'],
    [/backgroundColor:\s*'#22C55E'/g, 'backgroundColor: colors.primary'],
    [/backgroundColor:\s*'#E8F8EE'/g, 'backgroundColor: colors.primaryTint'],

    [/borderColor:\s*'#E2E8F0'/g, 'borderColor: colors.border'],
    [/borderColor:\s*'#E5E7EB'/g, 'borderColor: colors.border'],
    [/borderColor:\s*'#BBF7D0'/g, 'borderColor: colors.primaryBorder'],
    [/borderColor:\s*'#DCFCE7'/g, 'borderColor: colors.primaryBorderSubtle'],
    [/borderColor:\s*'#FDE68A'/g, 'borderColor: colors.warningBorder'],
    [/borderColor:\s*'#FECACA'/g, 'borderColor: colors.borderErrorLight'],
    [/borderColor:\s*'#16A34A'/g, 'borderColor: colors.primaryDark'],
    [/borderBottomColor:\s*'#F1F5F9'/g, 'borderBottomColor: colors.borderLight'],
    [/borderTopColor:\s*'#F1F5F9'/g, 'borderTopColor: colors.borderLight'],

    [/color:\s*'#0F172A'/g, 'color: colors.textPrimary'],
    [/color:\s*'#111827'/g, 'color: colors.textPrimary'],
    [/color:\s*'#1E293B'/g, 'color: palette.gray800'],
    [/color:\s*'#334155'/g, 'color: colors.textSecondary'],
    [/color:\s*'#475569'/g, 'color: colors.textSecondary'],
    [/color:\s*'#64748B'/g, 'color: colors.textSecondary'],
    [/color:\s*'#6B7280'/g, 'color: colors.textSecondary'],
    [/color:\s*'#94A3B8'/g, 'color: colors.textMuted'],
    [/color:\s*'#15803D'/g, 'color: colors.textGreen'],
    [/color:\s*'#16A34A'/g, 'color: colors.primaryDark'],
    [/color:\s*'#D97706'/g, 'color: colors.warningMedium'],
    [/color:\s*'#B45309'/g, 'color: colors.textWarningMedium'],
    [/color:\s*'#FFFFFF'/g, 'color: colors.white'],
    [/shadowColor:\s*'#000000'/g, 'shadowColor: colors.shadow'],
    [/shadowColor:\s*'#000'/g, 'shadowColor: colors.shadow'],
    [/shadowColor:\s*'#0F172A'/g, 'shadowColor: colors.shadow'],
    [/shadowColor:\s*'#16A34A'/g, 'shadowColor: colors.primaryDark'],
  ];

  reps.forEach(([pattern, repl]) => {
    content = content.replace(pattern, repl);
  });

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Standardized worker file:', relPath);
});
