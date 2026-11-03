const fs = require('fs');
const path = require('path');

const targetFiles = [
  'app/booking/[id]/review.tsx',
  'app/custom-request/new.tsx',
  'app/custom-request/[id]/checkout.tsx',
  'app/custom-request/[id]/index.tsx',
  'app/custom-request/[id]/quote.tsx',
  'app/notifications/preferences.tsx',
  'app/profile/reviews.tsx',
  'app/service/[id].tsx',
  'app/worker/[id].tsx',
];

targetFiles.forEach(f => {
  const p = path.join(process.cwd(), f);
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  lines.forEach((l, i) => {
    const m = l.match(/#[0-9a-fA-F]{3,8}/g);
    if (m) {
      console.log(`${f} L${i+1}: [${m.join(', ')}] ${l.trim()}`);
    }
  });
});
