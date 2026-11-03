const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const data = JSON.parse(fs.readFileSync(path.join(rootDir, 'audit_color_data.json'), 'utf8'));

// Filter screens in app/
const screenReports = data.fileReports.filter(f => f.file.startsWith('app/'));
console.log(`\n=== SCREENS IN app/ (${screenReports.length} files) ===`);
screenReports.forEach(s => {
  console.log(`\n[Screen] ${s.file} (Total raw hex: ${s.totalHex}, Distinct: ${s.distinctHex}, Uses colors token: ${s.usesColorsObject})`);
  const topHex = Object.entries(s.hexMap).sort((a,b) => b[1] - a[1]);
  console.log('   Colors:', topHex.map(([k,v]) => `${k} (${v})`).join(', '));
});

// Filter components in src/components/
const componentReports = data.fileReports.filter(f => f.file.startsWith('src/components/'));
console.log(`\n=== COMPONENTS IN src/components/ (${componentReports.length} files with hardcoded colors) ===`);
componentReports.forEach(c => {
  if (c.totalHex >= 5) {
    console.log(`\n[Component] ${c.file} (Total raw hex: ${c.totalHex}, Distinct: ${c.distinctHex}, Uses colors token: ${c.usesColorsObject})`);
    const topHex = Object.entries(c.hexMap).sort((a,b) => b[1] - a[1]);
    console.log('   Colors:', topHex.map(([k,v]) => `${k} (${v})`).join(', '));
  }
});
