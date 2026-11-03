const fs = require('fs');
const path = require('path');

const chatFiles = [
  'src/components/chat/ChatInput.tsx',
  'src/components/chat/ConversationRow.tsx',
  'src/components/chat/ChatHeader.tsx',
  'src/components/chat/ImageMessage.tsx',
  'src/components/chat/MessageBubble.tsx',
  'src/components/chat/ConversationTabs.tsx',
  'src/components/chat/MessageContextMenu.tsx',
  'src/components/chat/ConversationEmptyState.tsx',
  'src/components/chat/ArchivedBanner.tsx',
  'src/components/chat/MessagesHeader.tsx',
  'src/components/chat/NewMessagesBanner.tsx',
  'src/components/chat/ChatSkeleton.tsx',
  'src/components/chat/MessageTimestamp.tsx',
  'src/components/chat/SystemMessage.tsx',
  'src/components/chat/TypingIndicator.tsx',
  'src/components/chat/SkeletonConversationRow.tsx',
];

chatFiles.forEach(relPath => {
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
  content = content.replace(/color=\"#111827\"/g, 'color={colors.textPrimary}');
  content = content.replace(/color=\"#64748B\"/g, 'color={colors.textSecondary}');
  content = content.replace(/color=\"#475569\"/g, 'color={colors.textSecondary}');
  content = content.replace(/color=\"#6B7280\"/g, 'color={colors.textSecondary}');
  content = content.replace(/color=\"#94A3B8\"/g, 'color={colors.textMuted}');
  content = content.replace(/color=\"#CBD5E1\"/g, 'color={colors.textDisabled}');
  content = content.replace(/color=\"#2563EB\"/g, 'color={colors.textInfo}');
  content = content.replace(/color=\"#DC2626\"/g, 'color={colors.dangerMedium}');
  content = content.replace(/color=\"#EF4444\"/g, 'color={colors.danger}');
  content = content.replace(/placeholderTextColor=\"#9CA3AF\"/g, 'placeholderTextColor={colors.textMuted}');
  content = content.replace(/placeholderTextColor=\"#94A3B8\"/g, 'placeholderTextColor={colors.textMuted}');
  content = content.replace(/placeholderTextColor=\"#CBD5E1\"/g, 'placeholderTextColor={colors.textDisabled}');

  // Common styles
  const reps = [
    [/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard'],
    [/backgroundColor:\s*'#F8FAFC'/g, 'backgroundColor: colors.bgSubtle'],
    [/backgroundColor:\s*'#F1F5F9'/g, 'backgroundColor: colors.bgHover'],
    [/backgroundColor:\s*'#F3F4F6'/g, 'backgroundColor: colors.bgHover'],
    [/backgroundColor:\s*'#F9FAFB'/g, 'backgroundColor: colors.bgSubtle'],
    [/backgroundColor:\s*'#F0FDF4'/g, 'backgroundColor: colors.primaryTint'],
    [/backgroundColor:\s*'#DCFCE7'/g, 'backgroundColor: colors.primaryBorderSubtle'],
    [/backgroundColor:\s*'#FEF2F2'/g, 'backgroundColor: colors.dangerLight'],
    [/backgroundColor:\s*'#FEF3C7'/g, 'backgroundColor: colors.warningLight'],
    [/backgroundColor:\s*'#EFF6FF'/g, 'backgroundColor: colors.infoLight'],
    [/backgroundColor:\s*'#16A34A'/g, 'backgroundColor: colors.primaryDark'],
    [/backgroundColor:\s*'#2563EB'/g, 'backgroundColor: colors.infoMedium'],
    [/backgroundColor:\s*'#0F172A'/g, 'backgroundColor: colors.textPrimary'],
    [/backgroundColor:\s*'rgba\(15, 23, 42, 0\.5\)'/g, 'backgroundColor: colors.overlay'],
    [/backgroundColor:\s*'rgba\(15, 23, 42, 0\.55\)'/g, 'backgroundColor: colors.overlay'],

    [/borderColor:\s*'#E2E8F0'/g, 'borderColor: colors.border'],
    [/borderColor:\s*'#E5E7EB'/g, 'borderColor: colors.border'],
    [/borderColor:\s*'#F1F5F9'/g, 'borderColor: colors.borderLight'],
    [/borderColor:\s*'#BBF7D0'/g, 'borderColor: colors.primaryBorder'],
    [/borderColor:\s*'#DCFCE7'/g, 'borderColor: colors.primaryBorderSubtle'],
    [/borderColor:\s*'#BFDBFE'/g, 'borderColor: colors.borderInfoLight'],
    [/borderColor:\s*'#16A34A'/g, 'borderColor: colors.primaryDark'],
    [/borderBottomColor:\s*'#F1F5F9'/g, 'borderBottomColor: colors.borderLight'],
    [/borderBottomColor:\s*'#E2E8F0'/g, 'borderBottomColor: colors.border'],
    [/borderBottomColor:\s*'#F3F4F6'/g, 'borderBottomColor: colors.borderLight'],
    [/borderTopColor:\s*'#F3F4F6'/g, 'borderTopColor: colors.borderLight'],
    [/borderTopColor:\s*'#F1F5F9'/g, 'borderTopColor: colors.borderLight'],
    [/borderTopColor:\s*'#E2E8F0'/g, 'borderTopColor: colors.border'],

    [/color:\s*'#0F172A'/g, 'color: colors.textPrimary'],
    [/color:\s*'#111827'/g, 'color: colors.textPrimary'],
    [/color:\s*'#1E293B'/g, 'color: palette.gray800'],
    [/color:\s*'#334155'/g, 'color: colors.textSecondary'],
    [/color:\s*'#475569'/g, 'color: colors.textSecondary'],
    [/color:\s*'#64748B'/g, 'color: colors.textSecondary'],
    [/color:\s*'#6B7280'/g, 'color: colors.textSecondary'],
    [/color:\s*'#94A3B8'/g, 'color: colors.textMuted'],
    [/color:\s*'#9CA3AF'/g, 'color: colors.textMuted'],
    [/color:\s*'#CBD5E1'/g, 'color: colors.textDisabled'],
    [/color:\s*'#15803D'/g, 'color: colors.textGreen'],
    [/color:\s*'#16A34A'/g, 'color: colors.primaryDark'],
    [/color:\s*'#2563EB'/g, 'color: colors.textInfo'],
    [/color:\s*'#DC2626'/g, 'color: colors.dangerMedium'],
    [/color:\s*'#EF4444'/g, 'color: colors.danger'],
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
  console.log('Standardized chat file:', relPath);
});
