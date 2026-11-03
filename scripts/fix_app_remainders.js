const fs = require('fs');
const path = require('path');

function replaceInFile(relPath, pairs) {
  const full = path.join(process.cwd(), relPath);
  let content = fs.readFileSync(full, 'utf8');
  pairs.forEach(([target, repl]) => {
    content = content.replace(target, repl);
  });
  fs.writeFileSync(full, content, 'utf8');
  console.log('Fixed', relPath);
}

replaceInFile('app/booking/[id]/review.tsx', [
  [/borderColor:\s*'#EDF2F7'/g, 'borderColor: colors.borderLight'],
  [/backgroundColor:\s*'#E2E8F0'/g, 'backgroundColor: colors.border'],
  [/borderColor:\s*'#CBD5E1'/g, 'borderColor: colors.borderStrong'],
]);

replaceInFile('app/custom-request/new.tsx', [
  [/borderBottomColor:\s*'#F3F4F6'/g, 'borderBottomColor: colors.borderLight'],
]);

replaceInFile('app/custom-request/[id]/checkout.tsx', [
  [/backgroundColor:\s*'#E5E7EB'/g, 'backgroundColor: colors.border'],
]);

replaceInFile('app/custom-request/[id]/index.tsx', [
  [/borderColor:\s*'#16A34A'/g, 'borderColor: colors.primaryDark'],
]);

replaceInFile('app/custom-request/[id]/quote.tsx', [
  [/color=\{isFixed \? '#15803D' : '#D97706'\}/g, 'color={isFixed ? colors.textGreen : colors.warningMedium}'],
  [/borderTopColor:\s*'#F3F4F6'/g, 'borderTopColor: colors.borderLight'],
]);

replaceInFile('app/notifications/preferences.tsx', [
  [/color=\"#16A34A\"/g, 'color={colors.primaryDark}'],
  [/'#86EFAC'/g, 'palette.green300'],
  [/'#16A34A'/g, 'colors.primaryDark'],
]);

replaceInFile('app/profile/reviews.tsx', [
  [/backgroundColor=\"#FFFFFF\"/g, 'backgroundColor={colors.bgCard}'],
]);

replaceInFile('app/service/[id].tsx', [
  [/color:\s*'#FFFFFF'/g, 'color: colors.white'],
  [/shadowColor:\s*'#000'/g, 'shadowColor: colors.shadow'],
]);

replaceInFile('app/worker/[id].tsx', [
  [/backgroundColor:\s*'#16A34A'/g, 'backgroundColor: colors.primaryDark'],
  [/color:\s*'#FFFFFF'/g, 'color: colors.white'],
  [/colors\.textPrimary\s*\|\|\s*'#0F172A'/g, 'colors.textPrimary'],
  [/colors\.primary\s*\|\|\s*'#16A34A'/g, 'colors.primary'],
]);
