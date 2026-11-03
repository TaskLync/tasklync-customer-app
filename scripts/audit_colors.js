const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();
const dirsToScan = ['app', 'src'];

const HEX_REGEX = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const RGBA_REGEX = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/g;

const files = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.expo' && entry.name !== '.git') {
        scanDir(fullPath);
      }
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }
}

dirsToScan.forEach(d => scanDir(path.join(rootDir, d)));

const hexCounts = {};
const hexFiles = {};
const fileReports = [];

files.forEach(file => {
  const relativePath = path.relative(rootDir, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  
  // Extract all hex
  const matches = content.match(HEX_REGEX) || [];
  const rgbMatches = content.match(RGBA_REGEX) || [];
  
  const fileHex = {};
  matches.forEach(m => {
    const hex = m.toUpperCase();
    hexCounts[hex] = (hexCounts[hex] || 0) + 1;
    if (!hexFiles[hex]) hexFiles[hex] = new Set();
    hexFiles[hex].add(relativePath);
    
    fileHex[hex] = (fileHex[hex] || 0) + 1;
  });

  const importsDesignColors = /from ['"].*design\/colors['"]/.test(content);
  const usesColorsObject = /\bcolors\.[a-zA-Z0-9_]+/.test(content);
  const usesPaletteObject = /\bpalette\.[a-zA-Z0-9_]+/.test(content);
  
  fileReports.push({
    file: relativePath,
    totalHex: matches.length,
    distinctHex: Object.keys(fileHex).length,
    hexMap: fileHex,
    rgbCount: rgbMatches.length,
    importsDesignColors,
    usesColorsObject,
    usesPaletteObject,
  });
});

console.log('Total files scanned:', files.length);
console.log('Total distinct hex values:', Object.keys(hexCounts).length);

// Sort hex by frequency
const sortedHex = Object.entries(hexCounts).sort((a, b) => b[1] - a[1]);
console.log('\n--- Top 40 Most Frequent Hex Colors ---');
sortedHex.slice(0, 40).forEach(([hex, count]) => {
  console.log(`${hex}: ${count} times (in ${hexFiles[hex].size} files)`);
});

// Write comprehensive audit summary to JSON
const outputData = {
  totalFiles: files.length,
  totalDistinctHex: Object.keys(hexCounts).length,
  sortedHex: sortedHex.map(([hex, count]) => ({
    hex,
    count,
    filesCount: hexFiles[hex].size,
    files: Array.from(hexFiles[hex]),
  })),
  fileReports: fileReports.filter(f => f.totalHex > 0 || f.rgbCount > 0),
};

fs.writeFileSync(path.join(rootDir, 'audit_color_data.json'), JSON.stringify(outputData, null, 2));
console.log('\nAudit data saved to audit_color_data.json');
