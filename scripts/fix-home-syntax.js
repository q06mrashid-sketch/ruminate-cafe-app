const fs = require('fs');
const file = 'src/screens/HomeScreen.js';
if (!fs.existsSync(file)) { console.error('Missing', file); process.exit(1); }
let src = fs.readFileSync(file,'utf8');
fs.writeFileSync(file + '.bak_syntax', src);

// 1) Ensure imports (React: useEffect,useRef) (RN: Animated)
src = src.replace(
  /import\s+React,\s*\{([^}]*)\}\s+from\s+['"]react['"];/,
  (m, inner) => {
    const parts = inner.split(',').map(s=>s.trim()).filter(Boolean);
    if (!parts.includes('useEffect')) parts.push('useEffect');
    if (!parts.includes('useRef')) parts.push('useRef');
    return `import React, { ${Array.from(new Set(parts)).join(', ')} } from 'react';`;
  }
);
if (/import\s+React\s+from\s+['"]react['"];/.test(src) && !/useEffect|useRef/.test(src)) {
  src = src.replace(/import\s+React\s+from\s+['"]react['"];/, m => `${m}\nimport { useEffect, useRef } from 'react';`);
}
src = src.replace(
  /import\s+\{([^}]*)\}\s+from\s+['"]react-native['"];/,
  (m, inner) => {
    const parts = inner.split(',').map(s=>s.trim()).filter(Boolean);
    if (!parts.includes('Animated')) parts.push('Animated');
    return `import { ${Array.from(new Set(parts)).join(', ')} } from 'react-native';`;
  }
);

// 2) Ensure const signedIn exists after nextBill
if (!/const\s+signedIn\s*=/.test(src)) {
  src = src.replace(
    /(const\s+nextBill\s*=\s*[^;]+;\s*)/,
    `$1\n  const signedIn = !!(member && member.signedIn);\n`
  );
}

// 3) Fix ProgressBar closing tags inside the function only
(() => {
  const start = src.indexOf('function ProgressBar');
  if (start >= 0) {
    const bodyStart = src.indexOf('{', start) + 1;
    let depth = 1, i = bodyStart;
    for (; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') { depth--; if (depth === 0) break; }
    }
    if (i > bodyStart) {
      const seg = src.slice(start, i);
      const fixed = seg.replace(/<\/Animated\.View>/g, '</View>');
      if (fixed !== seg) {
        src = src.slice(0, start) + fixed + src.slice(i);
      }
    }
  }
})();

// 4) Replace entire signedIn conditional block with a known-good JSX
const conditionalRe = /\{\s*signedIn\s*\?\s*\([\s\S]*?\)\s*:\s*\([\s\S]*?\)\s*\}/;
const goodBlock = `{signedIn ? (
  <Animated.View style={[styles.rumiWrap, { opacity: quoteOpacity }]}>
    <Text style={styles.rumiQuote}>"Let the beauty we love be what we do."</Text>
    <Text style={styles.rumiAttribution}>— Rumi</Text>
  </Animated.View>
) : (
  <>
    <View style={{ height: 18 }} />
    <GlowingGlassButton text="Join today" variant="dark" ring onPress={() => navigation.navigate('MembershipStart')} />
    <View style={{ height: 10 }} />
    <GlowingGlassButton text="Learn about Membership & Profit Sharing" variant="light" onPress={() => navigation.navigate('Membership')} />
  </>
)}`;
if (conditionalRe.test(src)) {
  src = src.replace(conditionalRe, goodBlock);
} else if (src.includes('<GlowingGlassButton text="Join today"')) {
  // If no conditional exists, wrap the CTA block with our goodBlock
  const joinIdx = src.indexOf('<GlowingGlassButton text="Join today"');
  const before = src.lastIndexOf('\n', joinIdx);
  const afterLearn = src.indexOf('</', src.indexOf('GlowingGlassButton text="Learn about Membership', joinIdx));
  if (before !== -1 && afterLearn !== -1) {
    const prefix = src.slice(0, before+1);
    const suffix = src.slice(afterLearn);
    src = prefix + goodBlock + suffix;
  }
}

// 5) Ensure quoteOpacity hook and effect exist
if (!/quoteOpacity\s*=\s*useRef\(new Animated\.Value\(0\)\)\.current/.test(src)) {
  src = src.replace(
    /(const\s+signedIn\s*=\s*!!\([^)]*\);\s*)/,
    `$1\n  const quoteOpacity = useRef(new Animated.Value(0)).current;\n`
  );
}
if (!/Animated\.timing\(\s*quoteOpacity/.test(src)) {
  src = src.replace(
    /(const\s+quoteOpacity\s*=\s*useRef\(new Animated\.Value\(0\)\)\.current;\s*)/,
    `$1\n  useEffect(() => {\n    if (signedIn) {\n      try { quoteOpacity.setValue(0); } catch {}\n      Animated.timing(quoteOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }).start();\n    }\n  }, [signedIn]);\n`
  );
}

// 6) Ensure styles exist
if (!/rumiWrap\s*:|rumiQuote\s*:|rumiAttribution\s*:/.test(src)) {
  src = src.replace(
    /StyleSheet\.create\(\{\s*/,
    match => match + `
  rumiWrap: { paddingVertical: 30, paddingHorizontal: 20, alignItems: 'center' },
  rumiQuote: { fontSize: 18, fontStyle: 'italic', textAlign: 'center', color: '#fff', marginBottom: 5 },
  rumiAttribution: { fontSize: 14, color: '#ccc' },\n`
  );
}

fs.writeFileSync(file, src);
console.log('Patched HomeScreen.js (backup at .bak_syntax)');
