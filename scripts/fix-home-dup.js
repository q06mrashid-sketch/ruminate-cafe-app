const fs = require('fs');
const file = 'src/screens/HomeScreen.js';
if (!fs.existsSync(file)) { console.error('Missing', file); process.exit(1); }
let s = fs.readFileSync(file,'utf8');
fs.writeFileSync(file+'.bak_keep', s);

const learnNeedle = '<GlowingGlassButton text="Learn about Membership & Profit Sharing"';
const height10Re = /^\s*<View\s+style=\{\{\s*height:\s*10\s*\}\}\s*\/>\s*$/m;

// remove the last duplicate "Learn about..." (keep the one inside the signed-out branch)
const firstIdx = s.indexOf(learnNeedle);
const lastIdx = s.lastIndexOf(learnNeedle);
if (lastIdx !== -1 && lastIdx !== firstIdx) {
  const dupStart = s.lastIndexOf('\n', lastIdx) + 1;
  const dupEnd = s.indexOf('\n', s.indexOf('/>', lastIdx)) + 1;
  const prevLineStart = s.lastIndexOf('\n', dupStart - 2) + 1;
  const prevLine = s.slice(prevLineStart, dupStart);
  // if a height:10 spacer is right before it, remove that too
  if (height10Re.test(prevLine)) {
    s = s.slice(0, prevLineStart) + s.slice(dupEnd);
  } else {
    s = s.slice(0, dupStart) + s.slice(dupEnd);
  }
}

// remove any stray line that’s just `)}`
s = s.replace(/^\s*\)\}\s*$/m, '');

fs.writeFileSync(file, s);
console.log('Fixed HomeScreen: removed duplicate Learn button + stray `)}`. Backup:', file+'.bak_keep');
