const fs = require('fs');
const file = 'src/screens/HomeScreen.js';
if (!fs.existsSync(file)) { console.error('Missing', file); process.exit(1); }
let src = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file + '.bak_fragment', src);

const start = src.search(/\{\s*signedIn\s*\?\s*\(/);
if (start === -1) { console.log('No signedIn ternary found'); process.exit(0); }

const end = src.indexOf(')}', start);
if (end === -1) { console.log('Could not find end of ternary'); process.exit(1); }

const block = src.slice(start, end + 2);

// Wrap ELSE branch elements in a fragment <>...</>
const fixed = block.replace(/\)\s*:\s*\(\s*([\s\S]*?)\s*\)\s*\}\s*$/, ') : (\n            <>\n$1\n            </>\n          )}\n');

if (fixed !== block) {
  src = src.slice(0, start) + fixed + src.slice(end + 2);
  fs.writeFileSync(file, src);
  console.log('Wrapped ELSE branch in <>...</>. Backup at', file + '.bak_fragment');
} else {
  console.log('No change needed (ELSE branch already wrapped).');
}
