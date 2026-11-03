const fs = require('fs');
const path = require('path');

let duplicateCount = 0;

function scan(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.expo') {
        scan(full);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      const importedNames = {};

      lines.forEach((l) => {
        const importMatch = l.match(/import\s+(?:\{([^}]+)\}|([A-Za-z0-9_]+))\s+from/);
        if (importMatch) {
          const names = importMatch[1] 
            ? importMatch[1].split(',').map(n => n.trim().split(/\s+as\s+/).pop().trim())
            : [importMatch[2].trim()];
          
          names.forEach(name => {
            const clean = name.replace(/^type\s+/, '').trim();
            if (clean && clean !== 'type') {
              if (importedNames[clean]) {
                console.log(`Duplicate import '${clean}' in ${path.relative(process.cwd(), full)}`);
                duplicateCount++;
              }
              importedNames[clean] = true;
            }
          });
        }
      });
    }
  }
}

scan(path.join(process.cwd(), 'app'));
scan(path.join(process.cwd(), 'src'));
console.log('Total duplicate imports:', duplicateCount);
