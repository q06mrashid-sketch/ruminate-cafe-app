const fs = require('fs');
const file = 'src/screens/HomeScreen.js';
if (!fs.existsSync(file)) { console.error('Missing', file); process.exit(1); }
let src = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file + '.bak_fix', src);

// 1) Fix ProgressBar: restore </View> inside the component
(() => {
  const start = src.indexOf('function ProgressBar');
  if (start >= 0) {
    let end = src.indexOf('\n}', start);
    if (end === -1) end = start + 2000;
    const seg = src.slice(start, end);
    const fixed = seg.replace(/<\/Animated\.View>/g, '</View>');
    if (fixed !== seg) {
      src = src.slice(0, start) + fixed + src.slice(end);
      console.log('Fixed closing tag inside ProgressBar');
    }
  }
})();

// 2) Ensure the Rumi block closes with </Animated.View>
(() => {
  const openIdx = src.indexOf('<Animated.View style={[styles.rumiWrap');
  if (openIdx >= 0) {
    const existingCloseAnimated = src.indexOf('</Animated.View>', openIdx);
    if (existingCloseAnimated === -1) {
      const closeViewIdx = src.indexOf('</View>', openIdx);
      if (closeViewIdx >= 0) {
        src = src.slice(0, closeViewIdx) + '</Animated.View>' + src.slice(closeViewIdx + '</View>'.length);
        console.log('Patched Rumi block closing tag to </Animated.View>');
      }
    }
  }
})();

fs.writeFileSync(file, src);
console.log('Saved', file, '(backup at .bak_fix)');
