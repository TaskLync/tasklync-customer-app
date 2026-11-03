const fs = require('fs');

// 1. worker/[id].tsx
let worker = fs.readFileSync('app/worker/[id].tsx', 'utf8');
worker = worker.replace(/color=\"#16A34A\"/g, 'color={colors.primaryDark}');
worker = worker.replace(/color=\"#FFFFFF\"/g, 'color={colors.white}');
worker = worker.replace(/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard');
worker = worker.replace(/backgroundColor:\s*colors\.border\s*\|\|\s*'#E5E7EB'/g, 'backgroundColor: colors.border');
worker = worker.replace(/backgroundColor:\s*'#F0FDF4'/g, 'backgroundColor: colors.primaryTint');
worker = worker.replace(/borderColor:\s*'#BBF7D0'/g, 'borderColor: colors.primaryBorder');
worker = worker.replace(/backgroundColor:\s*'#DCFCE7'/g, 'backgroundColor: colors.primaryBorderSubtle');
worker = worker.replace(/color:\s*'#0F172A'/g, 'color: colors.textPrimary');
worker = worker.replace(/color:\s*'#475569'/g, 'color: colors.textSecondary');
worker = worker.replace(/color:\s*'#16A34A'/g, 'color: colors.primaryDark');
fs.writeFileSync('app/worker/[id].tsx', worker, 'utf8');
console.log('worker/[id].tsx standardized');

// 2. worker/[id]/reviews.tsx
let workerReviews = fs.readFileSync('app/worker/[id]/reviews.tsx', 'utf8');
workerReviews = workerReviews.replace(/'#F59E0B'/g, 'colors.starFilled');
workerReviews = workerReviews.replace(/backgroundColor=\"#FFFFFF\"/g, 'backgroundColor={colors.bgCard}');
fs.writeFileSync('app/worker/[id]/reviews.tsx', workerReviews, 'utf8');
console.log('worker/[id]/reviews.tsx standardized');

// 3. company/index.tsx
let company = fs.readFileSync('app/company/index.tsx', 'utf8');
company = company.replace(/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard');
company = company.replace(/backgroundColor:\s*'#F1F5F9'/g, 'backgroundColor: colors.bgHover');
company = company.replace(/backgroundColor:\s*'#F8FAFC'/g, 'backgroundColor: colors.bgSubtle');
company = company.replace(/borderColor:\s*'#E2E8F0'/g, 'borderColor: colors.border');
company = company.replace(/borderColor:\s*'#F1F5F9'/g, 'borderColor: colors.borderLight');
company = company.replace(/color:\s*'#FFFFFF'/g, 'color: colors.white');
fs.writeFileSync('app/company/index.tsx', company, 'utf8');
console.log('company/index.tsx standardized');

// 4. cart/index.tsx
let cart = fs.readFileSync('app/cart/index.tsx', 'utf8');
cart = cart.replace(/backgroundColor:\s*'#0F172A'/g, 'backgroundColor: colors.textPrimary');
fs.writeFileSync('app/cart/index.tsx', cart, 'utf8');
console.log('cart/index.tsx standardized');

// 5. service/[id].tsx
let service = fs.readFileSync('app/service/[id].tsx', 'utf8');
service = service.replace(
  /electrician:\s*\{\s*bg:\s*'#FEF3C7',\s*color:\s*'#D97706',\s*Icon:\s*Zap\s*\}/g,
  'electrician: { bg: palette.amber100, color: colors.warningMedium, Icon: Zap }'
);
service = service.replace(
  /plumber:\s*\{\s*bg:\s*'#EFF6FF',\s*color:\s*'#2563EB',\s*Icon:\s*Droplet\s*\}/g,
  'plumber: { bg: colors.infoLight, color: colors.textInfo, Icon: Droplet }'
);
service = service.replace(
  /ac_repair:\s*\{\s*bg:\s*'#F0F9FF',\s*color:\s*'#0284C7',\s*Icon:\s*Wind\s*\}/g,
  'ac_repair: { bg: palette.sky50, color: palette.sky600, Icon: Wind }'
);
service = service.replace(
  /cleaning:\s*\{\s*bg:\s*'#F0FDF4',\s*color:\s*'#16A34A',\s*Icon:\s*Sparkles\s*\}/g,
  'cleaning: { bg: colors.primaryTint, color: colors.primaryDark, Icon: Sparkles }'
);
service = service.replace(
  /carpenter:\s*\{\s*bg:\s*'#FFF7ED',\s*color:\s*'#EA580C',\s*Icon:\s*Hammer\s*\}/g,
  'carpenter: { bg: palette.orange50, color: palette.orange600, Icon: Hammer }'
);
service = service.replace(
  /painter:\s*\{\s*bg:\s*'#FDF4FF',\s*color:\s*'#C084FC',\s*Icon:\s*Paintbrush\s*\}/g,
  'painter: { bg: palette.purple50, color: palette.purple400, Icon: Paintbrush }'
);
service = service.replace(
  /const DEFAULT_STYLE = \{\s*bg:\s*'#F3F4F6',\s*color:\s*'#4B5563',\s*Icon:\s*Wrench\s*\};/g,
  'const DEFAULT_STYLE = { bg: colors.bgHover, color: colors.textSecondary, Icon: Wrench };'
);
service = service.replace(/backgroundColor:\s*'#FFFFFF'/g, 'backgroundColor: colors.bgCard');
fs.writeFileSync('app/service/[id].tsx', service, 'utf8');
console.log('service/[id].tsx standardized');
