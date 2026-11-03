const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

function auditDir(relDir) {
  const dir = path.join(rootDir, relDir);
  const files = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
  const results = {};

  for (const f of files) {
    if (f.isFile() && (f.name.endsWith('.ts') || f.name.endsWith('.tsx'))) {
      const filePath = path.join(f.parentPath || f.path, f.name);
      const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');
      const lines = fs.readFileSync(filePath, 'utf8').split('\n');
      
      const fileMatches = [];
      lines.forEach((line, idx) => {
        const hexMatches = line.match(/#([0-9a-fA-F]{3,8})\b/g);
        const rgbaMatches = line.match(/rgba?\([^)]+\)/g);
        if (hexMatches || rgbaMatches) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
            fileMatches.push({
              lineNum: idx + 1,
              content: trimmed,
              hex: hexMatches || [],
              rgba: rgbaMatches || [],
            });
          }
        }
      });
      if (fileMatches.length > 0) {
        const parts = relPath.split('/');
        const sub = parts[2] || 'root';
        if (!results[sub]) results[sub] = [];
        results[sub].push({ relPath, count: fileMatches.length, matches: fileMatches });
      }
    }
  }
  return results;
}

const compAudit = auditDir('src/components');
console.log('=== COMPONENTS BY SUBFOLDER ===');
for (const [sub, files] of Object.entries(compAudit)) {
  const totalInSub = files.reduce((acc, f) => acc + f.count, 0);
  console.log(`\n[${sub}] Total raw occurrences: ${totalInSub} in ${files.length} files`);
  files.forEach(f => {
    console.log(`   - ${f.relPath}: ${f.count} occurrences`);
  });
}
