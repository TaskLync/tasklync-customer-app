const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/booking/[id].tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add import if missing
if (!content.includes("from '../../src/design'")) {
  content = content.replace(
    "import { companyTokens } from '../../src/theme/companyTokens';",
    "import { companyTokens } from '../../src/theme/companyTokens';\nimport { colors, palette } from '../../src/design';"
  );
}

// Status badge replacements
content = content.replace("bg: '#FEF3C7',\n          text: '#D97706',\n          dot: '#F59E0B',", "bg: colors.warningLight,\n          text: colors.warningMedium,\n          dot: colors.warning,");
content = content.replace("bg: '#DCFCE7',\n          text: '#15803D',\n          dot: '#16A34A',", "bg: colors.primaryBorderSubtle,\n          text: colors.textGreen,\n          dot: colors.primaryDark,");
content = content.replace("bg: '#EFF6FF',\n          text: '#2563EB',\n          dot: '#3B82F6',", "bg: colors.infoLight,\n          text: colors.textInfo,\n          dot: colors.info,");
content = content.replace("bg: '#FEF3C7',\n          text: '#B45309',\n          dot: '#F59E0B',", "bg: colors.warningLight,\n          text: colors.textWarningMedium,\n          dot: colors.warning,");
content = content.replace("bg: '#DCFCE7',\n          text: '#15803D',\n          dot: '#16A34A',", "bg: colors.primaryBorderSubtle,\n          text: colors.textGreen,\n          dot: colors.primaryDark,");
content = content.replace("bg: '#FEE2E2',\n          text: '#DC2626',\n          dot: '#EF4444',", "bg: colors.dangerLight,\n          text: colors.dangerMedium,\n          dot: colors.danger,");
content = content.replace("bg: '#FEE2E2',\n          text: '#DC2626',\n          dot: '#EF4444',", "bg: colors.dangerLight,\n          text: colors.dangerMedium,\n          dot: colors.danger,");
content = content.replace("bg: '#FEF2F2',\n          text: '#B91C1C',\n          dot: '#DC2626',", "bg: colors.dangerLight,\n          text: palette.red700,\n          dot: colors.dangerMedium,");
content = content.replace("bg: '#F1F5F9',\n          text: '#475569',\n          dot: '#64748B',", "bg: colors.borderLight,\n          text: colors.textSecondary,\n          dot: palette.gray500,");

// JSX inline replacements
content = content.replace(/backgroundColor=\"#FFFFFF\"/g, 'backgroundColor={colors.bgCard}');
content = content.replace(/<ActivityIndicator size=\"large\" color=\"#16A34A\" \/>/g, '<ActivityIndicator size="large" color={colors.primaryDark} />');
content = content.replace(/<ActivityIndicator size=\"small\" color=\"#16A34A\" \/>/g, '<ActivityIndicator size="small" color={colors.primaryDark} />');
content = content.replace(/<ActivityIndicator size=\"small\" color=\"#FFFFFF\" \/>/g, '<ActivityIndicator size="small" color={colors.white} />');
content = content.replace(/<ArrowLeft size={20} color=\"#0F172A\" \/>/g, '<ArrowLeft size={20} color={colors.textPrimary} />');
content = content.replace(/<Check size={10} color=\"#15803D\" strokeWidth={3} \/>/g, '<Check size={10} color={colors.textGreen} strokeWidth={3} />');
content = content.replace(/<Copy size={10} color=\"#64748B\"/g, '<Copy size={10} color={colors.textSecondary}');
content = content.replace(/<RefreshCw size={18} color=\"#475569\" \/>/g, '<RefreshCw size={18} color={colors.textSecondary} />');
content = content.replace(/<Check size={11} color=\"#FFFFFF\" strokeWidth={3} \/>/g, '<Check size={11} color={colors.white} strokeWidth={3} />');
content = content.replace(/<ShieldCheck size={12} color=\"#15803D\" strokeWidth={2.5} \/>/g, '<ShieldCheck size={12} color={colors.textGreen} strokeWidth={2.5} />');
content = content.replace(/<Star size={12} color=\"#F59E0B\" fill=\"#F59E0B\" \/>/g, '<Star size={12} color={colors.starFilled} fill={colors.starFilled} />');
content = content.replace(/<MessageSquare size={17} color=\"#16A34A\" \/>/g, '<MessageSquare size={17} color={colors.primaryDark} />');
content = content.replace(/<Phone size={17} color=\"#FFFFFF\" \/>/g, '<Phone size={17} color={colors.white} />');
content = content.replace(/<Clock size={16} color=\"#64748B\" \/>/g, '<Clock size={16} color={colors.textSecondary} />');
content = content.replace(/<ExternalLink size={12} color=\"#16A34A\"/g, '<ExternalLink size={12} color={colors.primaryDark}');
content = content.replace(/<MapPin size={18} color=\"#16A34A\" \/>/g, '<MapPin size={18} color={colors.primaryDark} />');
content = content.replace(/<Text style=\{\[styles\.billValue, \{ color: '#D97706' \}\]\}>/g, '<Text style={[styles.billValue, { color: colors.warningMedium }]}>');
content = content.replace(/<FileText size={16} color=\"#FFFFFF\"/g, '<FileText size={16} color={colors.white}');
content = content.replace(/<Star size={16} color=\"#16A34A\"/g, '<Star size={16} color={colors.primaryDark}');
content = content.replace(/placeholderTextColor=\"#9CA3AF\"/g, 'placeholderTextColor={colors.textMuted}');

// Style property replacements
const styleReplacements = [
  // Backgrounds
  [/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard'],
  [/backgroundColor:\s*'#F8FAFC'/g, 'backgroundColor: colors.bgApp'],
  [/backgroundColor:\s*'#F1F5F9'/g, 'backgroundColor: colors.bgHover'],
  [/backgroundColor:\s*'#DCFCE7'/g, 'backgroundColor: colors.primaryBorderSubtle'],
  [/backgroundColor:\s*'#16A34A'/g, 'backgroundColor: colors.primaryDark'],
  [/backgroundColor:\s*'#F0FDF4'/g, 'backgroundColor: colors.primaryTint'],
  [/backgroundColor:\s*'#FEF2F2'/g, 'backgroundColor: colors.dangerLight'],
  [/backgroundColor:\s*'#EFF6FF'/g, 'backgroundColor: colors.infoLight'],
  [/backgroundColor:\s*'#E2E8F0'/g, 'backgroundColor: colors.border'],
  [/backgroundColor:\s*'#CBD5E1'/g, 'backgroundColor: colors.borderStrong'],
  
  // Borders
  [/borderColor:\s*'#EDF2F7'/g, 'borderColor: colors.borderLight'],
  [/borderColor:\s*'#CBD5E1'/g, 'borderColor: colors.borderStrong'],
  [/borderColor:\s*'#16A34A'/g, 'borderColor: colors.primaryDark'],
  [/borderColor:\s*'#DCFCE7'/g, 'borderColor: colors.primaryBorderSubtle'],
  [/borderColor:\s*'#FECACA'/g, 'borderColor: colors.borderErrorLight'],
  [/borderColor:\s*'#E2E8F0'/g, 'borderColor: colors.border'],
  [/borderBottomColor:\s*'#F1F5F9'/g, 'borderBottomColor: colors.borderLight'],
  [/borderTopColor:\s*'#F8FAFC'/g, 'borderTopColor: colors.borderLight'],
  [/borderTopColor:\s*'#F1F5F9'/g, 'borderTopColor: colors.borderLight'],

  // Colors
  [/color:\s*'#0F172A'/g, 'color: colors.textPrimary'],
  [/color:\s*'#64748B'/g, 'color: colors.textSecondary'],
  [/color:\s*'#475569'/g, 'color: colors.textSecondary'],
  [/color:\s*'#16A34A'/g, 'color: colors.primaryDark'],
  [/color:\s*'#15803D'/g, 'color: colors.textGreen'],
  [/color:\s*'#94A3B8'/g, 'color: colors.textMuted'],
  [/color:\s*'#1E293B'/g, 'color: palette.gray800'],
  [/color:\s*'#DC2626'/g, 'color: colors.dangerMedium'],
  [/color:\s*'#7F1D1D'/g, 'color: palette.red900'],
  [/color:\s*'#991B1B'/g, 'color: colors.textDangerDark'],
  [/color:\s*'#B91C1C'/g, 'color: palette.red700'],
  [/color:\s*'#FFFFFF'/g, 'color: colors.white'],
  [/shadowColor:\s*'#0F172A'/g, 'shadowColor: colors.shadow'],
];

styleReplacements.forEach(([pattern, repl]) => {
  content = content.replace(pattern, repl);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated app/booking/[id].tsx');
