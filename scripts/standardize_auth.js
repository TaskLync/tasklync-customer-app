const fs = require('fs');

// 1. location-permission.tsx
let loc = fs.readFileSync('app/(auth)/location-permission.tsx', 'utf8');
loc = loc.replace(/'rgba\(15, 23, 42, 0.55\)'/g, 'colors.overlay');
loc = loc.replace(/borderColor:\s*'#FECACA'/g, 'borderColor: colors.borderErrorLight');
loc = loc.replace(/backgroundColor:\s*'#FEF3C7'/g, 'backgroundColor: colors.warningLight');
loc = loc.replace(/borderColor:\s*'#FDE68A'/g, 'borderColor: colors.warningBorder');
loc = loc.replace(/color:\s*'#92400E'/g, 'color: colors.textWarning');
fs.writeFileSync('app/(auth)/location-permission.tsx', loc, 'utf8');
console.log('location-permission.tsx standardized');

// 2. welcome.tsx
let wel = fs.readFileSync('app/(auth)/welcome.tsx', 'utf8');
wel = wel.replace(/color:\s*'#F0FDF4'/g, 'color: colors.primaryTint');
wel = wel.replace(/color:\s*'#FEF3C7'/g, 'color: colors.warningLight');
wel = wel.replace(/color:\s*'#E0E7FF'/g, 'color: palette.blue100');
wel = wel.replace(/shadowColor:\s*'#000'/g, 'shadowColor: colors.shadow');
wel = wel.replace(/borderTopColor:\s*'rgba\(0,0,0,0.02\)'/g, 'borderTopColor: colors.borderLight');
fs.writeFileSync('app/(auth)/welcome.tsx', wel, 'utf8');
console.log('welcome.tsx standardized');

// 3. phone.tsx
let phone = fs.readFileSync('app/(auth)/phone.tsx', 'utf8');
phone = phone.replace(/\/\/ #86EFAC/g, '');
fs.writeFileSync('app/(auth)/phone.tsx', phone, 'utf8');
console.log('phone.tsx standardized');
