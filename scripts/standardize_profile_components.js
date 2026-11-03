const fs = require('fs');
const path = require('path');

function fix(relPath, reps) {
  const p = path.join(process.cwd(), relPath);
  let content = fs.readFileSync(p, 'utf8');
  reps.forEach(([from, to]) => {
    content = content.replace(from, to);
  });
  fs.writeFileSync(p, content, 'utf8');
  console.log('Standardized:', relPath);
}

fix('src/components/profile/ProfileHeader.tsx', [
  [/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard'],
  [/borderColor:\s*'#F1F5F9'/g, 'borderColor: colors.borderLight'],
  [/shadowColor:\s*'#0F172A'/g, 'shadowColor: colors.shadow'],
  [/color:\s*'#0F172A'/g, 'color: colors.textPrimary'],
  [/backgroundColor:\s*'#F0FDF4'/g, 'backgroundColor: colors.primaryTint'],
  [/borderColor:\s*'#DCFCE7'/g, 'borderColor: colors.primaryBorderSubtle'],
  [/color:\s*'#64748B'/g, 'color: colors.textSecondary'],
]);

fix('src/components/profile/ProfileMenuItem.tsx', [
  [/color=\{\s*isDanger\s*\?\s*colors\.textDanger\s*:\s*'#94A3B8'\s*\}/g, 'color={isDanger ? colors.textDanger : colors.textMuted}'],
  [/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard'],
  [/borderColor:\s*'#F1F5F9'/g, 'borderColor: colors.borderLight'],
  [/shadowColor:\s*'#0F172A'/g, 'shadowColor: colors.shadow'],
  [/backgroundColor:\s*'#FEF2F2'/g, 'backgroundColor: colors.dangerLight'],
  [/borderColor:\s*'#FEE2E2'/g, 'borderColor: colors.borderErrorLight'],
  [/backgroundColor:\s*'#F0FDF4'/g, 'backgroundColor: colors.primaryTint'],
  [/backgroundColor:\s*'#FEE2E2'/g, 'backgroundColor: colors.borderErrorLight'],
  [/color:\s*'#0F172A'/g, 'color: colors.textPrimary'],
  [/color:\s*'#64748B'/g, 'color: colors.textSecondary'],
  [/backgroundColor:\s*'#DCFCE7'/g, 'backgroundColor: colors.primaryBorderSubtle'],
  [/color:\s*'#15803D'/g, 'color: colors.textGreen'],
]);

fix('src/components/profile/ProfileStatsRow.tsx', [
  [/color=\"#D97706\"\s+fill=\"#F59E0B\"/g, 'color={colors.warningMedium} fill={colors.starFilled}'],
  [/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard'],
  [/borderColor:\s*'#F1F5F9'/g, 'borderColor: colors.borderLight'],
  [/shadowColor:\s*'#0F172A'/g, 'shadowColor: colors.shadow'],
  [/backgroundColor:\s*'#F0FDF4'/g, 'backgroundColor: colors.primaryTint'],
  [/borderColor:\s*'#DCFCE7'/g, 'borderColor: colors.primaryBorderSubtle'],
  [/backgroundColor:\s*'#FEF3C7'/g, 'backgroundColor: colors.warningLight'],
  [/borderColor:\s*'#FDE68A'/g, 'borderColor: colors.warningBorder'],
  [/color:\s*'#0F172A'/g, 'color: colors.textPrimary'],
  [/color:\s*'#94A3B8'/g, 'color: colors.textMuted'],
  [/color:\s*'#64748B'/g, 'color: colors.textSecondary'],
]);
