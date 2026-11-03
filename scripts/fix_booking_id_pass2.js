const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/booking/[id].tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/color=\"#0F172A\"/g, 'color={colors.textPrimary}');
content = content.replace(/color=\"#15803D\"/g, 'color={colors.textGreen}');
content = content.replace(/color=\"#64748B\"/g, 'color={colors.textSecondary}');
content = content.replace(/color=\"#475569\"/g, 'color={colors.textSecondary}');
content = content.replace(/color=\"#FFFFFF\"/g, 'color={colors.white}');
content = content.replace(/color=\"#F59E0B\"/g, 'color={colors.starFilled}');
content = content.replace(/fill=\"#F59E0B\"/g, 'fill={colors.starFilled}');
content = content.replace(/color=\"#16A34A\"/g, 'color={colors.primaryDark}');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finished secondary pass on app/booking/[id].tsx');
