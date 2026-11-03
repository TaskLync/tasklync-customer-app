const fs = require('fs');
const path = require('path');

let issues = [];

function checkFile(fullPath) {
  const content = fs.readFileSync(fullPath, 'utf8');
  const relPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
  
  // Look for standalone colors.xxx (not foo.colors.xxx)
  const usesColors = /(?<![.\w])colors\.[a-zA-Z0-9_]+/.test(content);
  const usesPalette = /(?<![.\w])palette\.[a-zA-Z0-9_]+/.test(content);

  const hasColorsImport = /import\s+[^;]*\bcolors\b[^;]*from/.test(content);
  const hasPaletteImport = /import\s+[^;]*\bpalette\b[^;]*from/.test(content);

  const definesColors = content.includes('export const colors =') || content.includes('const colors =');
  const definesPalette = content.includes('export const palette =') || content.includes('const palette =');

  if (usesColors && !hasColorsImport && !definesColors) {
    issues.push({ file: relPath, type: 'missing colors import' });
  }
  if (usesPalette && !hasPaletteImport && !definesPalette) {
    issues.push({ file: relPath, type: 'missing palette import' });
  }
}

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.expo') {
        scanDir(full);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      checkFile(full);
    }
  }
}

scanDir(path.join(process.cwd(), 'app'));
scanDir(path.join(process.cwd(), 'src'));

console.log('Total verified missing import issues:', issues.length);
issues.forEach(i => console.log('  -', i.file, ':', i.type));
