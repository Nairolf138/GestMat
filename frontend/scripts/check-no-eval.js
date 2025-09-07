const fs = require('fs');
const path = require('path');

const forbiddenPatterns = [
  { regex: /\beval\s*\(/, message: 'eval()' },
  { regex: /\bnew\s+Function\b/, message: 'new Function()' },
  {
    regex: /\bsetTimeout\s*\(\s*['"`]/,
    message: 'setTimeout with string argument',
  },
  {
    regex: /\bsetInterval\s*\(\s*['"`]/,
    message: 'setInterval with string argument',
  },
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  for (const { regex, message } of forbiddenPatterns) {
    if (regex.test(content)) {
      console.error(`Forbidden ${message} found in ${filePath}`);
      process.exitCode = 1;
    }
  }
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (/\.[jt]sx?$/.test(entry.name)) {
      checkFile(fullPath);
    }
  }
}

const srcDir = path.join(__dirname, '..', 'src');
walk(srcDir);

if (process.exitCode) {
  process.exit(1);
}
