const fs = require('fs');

// messages.tsx
let messages = fs.readFileSync('app/(tabs)/messages.tsx', 'utf8');
messages = messages.replace(/backgroundColor=\"#FFFFFF\"/g, 'backgroundColor={colors.bgCard}');
messages = messages.replace(/backgroundColor:\s*'#F8FAFC'/g, 'backgroundColor: colors.bgApp');
messages = messages.replace(/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard');
messages = messages.replace(/borderBottomColor:\s*'#F1F5F9'/g, 'borderBottomColor: colors.borderLight');
messages = messages.replace(/borderColor:\s*'#E2E8F0'/g, 'borderColor: colors.border');
fs.writeFileSync('app/(tabs)/messages.tsx', messages, 'utf8');
console.log('messages.tsx standardized');

// profile.tsx
let profile = fs.readFileSync('app/(tabs)/profile.tsx', 'utf8');
profile = profile.replace(/backgroundColor=\"#F8FAFC\"/g, 'backgroundColor={colors.bgApp}');
profile = profile.replace(/backgroundColor:\s*'#F8FAFC'/g, 'backgroundColor: colors.bgApp');
profile = profile.replace(/color:\s*'#0F172A'/g, 'color: colors.textPrimary');
profile = profile.replace(/backgroundColor:\s*'#FEF2F2'/g, 'backgroundColor: colors.dangerLight');
profile = profile.replace(/borderColor:\s*'#FEE2E2'/g, 'borderColor: colors.borderErrorLight');
profile = profile.replace(/backgroundColor:\s*'#FEE2E2'/g, 'backgroundColor: colors.borderErrorLight');
profile = profile.replace(/shadowColor:\s*'#0F172A'/g, 'shadowColor: colors.shadow');
profile = profile.replace(/color:\s*'#94A3B8'/g, 'color: colors.textMuted');
profile = profile.replace(/color:\s*'#CBD5E1'/g, 'color: colors.textDisabled');
fs.writeFileSync('app/(tabs)/profile.tsx', profile, 'utf8');
console.log('profile.tsx standardized');

// bookings.tsx
let bookings = fs.readFileSync('app/(tabs)/bookings.tsx', 'utf8');
bookings = bookings.replace(/color=\"#FFFFFF\"/g, 'color={colors.white}');
bookings = bookings.replace(/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard');
bookings = bookings.replace(/borderBottomColor:\s*'#E5E7EB'/g, 'borderBottomColor: colors.border');
bookings = bookings.replace(/backgroundColor:\s*'#F3F4F6'/g, 'backgroundColor: colors.bgHover');
bookings = bookings.replace(/backgroundColor:\s*'#DCFCE7'/g, 'backgroundColor: colors.primaryBorderSubtle');
bookings = bookings.replace(/color:\s*'#15803D'/g, 'color: colors.textGreen');
bookings = bookings.replace(/backgroundColor:\s*'#16A34A'/g, 'backgroundColor: colors.primaryDark');
bookings = bookings.replace(/color:\s*'#FFFFFF'/g, 'color: colors.white');
bookings = bookings.replace(/borderBottomColor:\s*'#F3F4F6'/g, 'borderBottomColor: colors.borderLight');
fs.writeFileSync('app/(tabs)/bookings.tsx', bookings, 'utf8');
console.log('bookings.tsx standardized');
