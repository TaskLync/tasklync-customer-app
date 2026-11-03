const fs = require('fs');
const lines = fs.readFileSync('app/booking/[id].tsx', 'utf8').split('\n');
lines.forEach((l, i) => {
  const m = l.match(/#[0-9a-fA-F]{3,8}/g);
  if (m) {
    console.log(`L${i+1}: [${m.join(', ')}] ${l.trim().slice(0, 100)}`);
  }
});
