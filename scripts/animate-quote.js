const fs = require('fs');
const path = 'src/screens/HomeScreen.js';
if (!fs.existsSync(path)) { console.error('Missing file:', path); process.exit(1); }
let src = fs.readFileSync(path,'utf8');
fs.writeFileSync(path + '.bak2', src);

let changed = false;

// 1) Ensure useRef is imported from react
const reactImportRE = /import\s+React,\s*\{([^}]*)\}\s+from\s+['"]react['"];/;
if (reactImportRE.test(src)) {
  src = src.replace(reactImportRE, (m, inner) => {
    if (/\buseRef\b/.test(inner)) return m;
    const parts = inner.split(',').map(s => s.trim()).filter(Boolean);
    parts.push('useRef');
    const uniq = Array.from(new Set(parts));
    changed = true;
    return `import React, { ${uniq.join(', ')} } from 'react';`;
  });
} else if (!/\bfrom ['"]react['"];/.test(src) || !/\buseRef\b/.test(src)) {
  src = src.replace(/import\s+React\s+from\s+['"]react['"];/, (m) => `${m}\nimport { useRef } from 'react';`);
  changed = true;
}

// 2) Ensure Animated is imported from react-native
const rnImportRE = /import\s+\{([^}]*)\}\s+from\s+['"]react-native['"];/;
if (rnImportRE.test(src)) {
  src = src.replace(rnImportRE, (m, inner) => {
    if (/\bAnimated\b/.test(inner)) return m;
    const parts = inner.split(',').map(s => s.trim()).filter(Boolean);
    parts.push('Animated');
    const uniq = Array.from(new Set(parts));
    changed = true;
    return `import { ${uniq.join(', ')} } from 'react-native';`;
  });
} else {
  src = src.replace(/(import\s+.*from\s+['"]react-native['"];)/, (m) => `${m}\n// Animated import added\nimport { Animated } from 'react-native';`);
  changed = true;
}

// 3) Insert quoteOpacity after `signedIn` (or after nextBill as fallback)
if (!/quoteOpacity\s*=\s*useRef\(new Animated\.Value\(0\)\)\.current/.test(src)) {
  const afterSignedInRE = /(const\s+signedIn\s*=\s*!!member\?\.(?:signedIn|signedIn);?\s*)/;
  const afterNextBillRE = /(const\s+nextBill\s*=\s*[^;]+;\s*)/;
  if (afterSignedInRE.test(src)) {
    src = src.replace(afterSignedInRE, `$1\n  const quoteOpacity = useRef(new Animated.Value(0)).current;\n`);
    changed = true;
  } else if (afterNextBillRE.test(src)) {
    src = src.replace(afterNextBillRE, `$1\n  const quoteOpacity = useRef(new Animated.Value(0)).current;\n`);
    changed = true;
  }
}

// 4) Insert useEffect to run fade when signedIn changes
if (!/Animated\.timing\(\s*quoteOpacity/.test(src)) {
  const insertAfter = /(const\s+quoteOpacity\s*=\s*useRef\(new Animated\.Value\(0\)\)\.current;\s*)/;
  if (insertAfter.test(src)) {
    src = src.replace(insertAfter, `$1\n  useEffect(() => {\n    if (signedIn) {\n      try { quoteOpacity.setValue(0); } catch {}\n      Animated.timing(quoteOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }).start();\n    }\n  }, [signedIn]);\n`);
    changed = true;
  }
}

// 5) Replace the Rumi container View with Animated.View + opacity binding
if (src.includes('<View style={styles.rumiWrap}>')) {
  src = src.replace('<View style={styles.rumiWrap}>', '<Animated.View style={[styles.rumiWrap, { opacity: quoteOpacity }]}>' );
  // Replace only the matching closing tag that pairs with the Rumi block. We assume first occurrence is the Rumi block.
  src = src.replace('</View>', '</Animated.View>');
  changed = true;
}

// 6) Ensure styles for rumi* exist (from earlier patch)
if (!/rumiWrap\s*:/.test(src)) {
  const stylesEnd = src.lastIndexOf('});');
  const insertAt = stylesEnd > -1 ? stylesEnd : -1;
  if (insertAt !== -1) {
    const chunk = `
  rumiWrap: { paddingVertical: 30, paddingHorizontal: 20, alignItems: 'center' },
  rumiQuote: { fontSize: 18, fontStyle: 'italic', textAlign: 'center', color: '#fff', marginBottom: 5 },
  rumiAttribution: { fontSize: 14, color: '#ccc' },
`;
    src = src.slice(0, insertAt) + chunk + src.slice(insertAt);
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(path, src);
  console.log('Animated fade-in added. Backup at', path + '.bak2');
} else {
  console.log('No changes needed (already patched).');
}
