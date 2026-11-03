const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

function auditDir(relDir) {
  const dir = path.join(rootDir, relDir);
  const files = fs.readdirSync(dir, { recursive: true, withFileTypes: true });
  const results = [];

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
          // ignore comments if purely comment
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
        results.push({ relPath, matches: fileMatches });
      }
    }
  }
  return results;
}

const appAudit = auditDir('app');
console.log(`Found ${appAudit.length} files in app/ with raw colors.\n`);
appAudit.forEach(a => {
  console.log(`FILE: ${a.relPath} (${a.matches.length} occurrences)`);
  a.matches.slice(0, 10).forEach(m => {
    console.log(`  L${m.lineNum}: [${m.hex.join(', ')}] ${m.content.slice(0, 100)}`);
  });
  if (a.matches.length > 10) {
    console.log(`  ... and ${a.matches.length - 10} more`);
  }
  console.log('');
});
