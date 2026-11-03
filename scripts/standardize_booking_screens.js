const fs = require('fs');
const path = require('path');

// 1. review.tsx
let review = fs.readFileSync('app/booking/[id]/review.tsx', 'utf8');

review = review.replace(/backgroundColor:\s*'#F1F5F9'/g, 'backgroundColor: colors.bgHover');
review = review.replace(/color=\"#64748B\"/g, 'color={colors.textSecondary}');
review = review.replace(/color=\"#15803D\"/g, 'color={colors.textGreen}');
review = review.replace(/color=\"#FFFFFF\"/g, 'color={colors.white}');

review = review.replace(/backgroundColor:\s*'#F8FAFC'/g, 'backgroundColor: colors.bgApp');
review = review.replace(/borderBottomColor:\s*'#EDF2F7'/g, 'borderBottomColor: colors.borderLight');
review = review.replace(/borderColor:\s*'#E2E8F0'/g, 'borderColor: colors.border');
review = review.replace(/backgroundColor:\s*'#F0FDF4'/g, 'backgroundColor: colors.primaryTint');
review = review.replace(/borderColor:\s*'#BBF7D0'/g, 'borderColor: colors.primaryBorder');
review = review.replace(/color:\s*'#15803D'/g, 'color: colors.textGreen');
review = review.replace(/color:\s*'#166534'/g, 'color: colors.textGreenDark');
review = review.replace(/backgroundColor:\s*'#FEF2F2'/g, 'backgroundColor: colors.dangerLight');
review = review.replace(/borderColor:\s*'#FECACA'/g, 'borderColor: colors.borderErrorLight');
review = review.replace(/color:\s*'#94A3B8'/g, 'color: colors.textMuted');
review = review.replace(/color:\s*'#CBD5E1'/g, 'color: colors.textDisabled');
review = review.replace(/color:\s*'#475569'/g, 'color: colors.textSecondary');
review = review.replace(/color:\s*'#64748B'/g, 'color: colors.textSecondary');
review = review.replace(/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard');
review = review.replace(/color:\s*'#FFFFFF'/g, 'color: colors.white');

fs.writeFileSync('app/booking/[id]/review.tsx', review, 'utf8');
console.log('review.tsx standardized');

// 2. dispute.tsx
let dispute = fs.readFileSync('app/booking/[id]/dispute.tsx', 'utf8');
dispute = dispute.replace(/borderColor:\s*'#FECACA'/g, 'borderColor: colors.borderErrorLight');
fs.writeFileSync('app/booking/[id]/dispute.tsx', dispute, 'utf8');
console.log('dispute.tsx standardized');

// 3. track.tsx
let track = fs.readFileSync('app/booking/[id]/track.tsx', 'utf8');
if (!track.includes('colors')) {
  track = "import { colors } from '../../../src/design';\n" + track;
}
track = track.replace(/color=\"#16A34A\"/g, 'color={colors.primaryDark}');
fs.writeFileSync('app/booking/[id]/track.tsx', track, 'utf8');
console.log('track.tsx standardized');
