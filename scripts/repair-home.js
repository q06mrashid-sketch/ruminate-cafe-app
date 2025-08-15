const fs = require('fs');
const file = 'src/screens/HomeScreen.js';
if (!fs.existsSync(file)) { console.error('Missing', file); process.exit(1); }
let src = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file + '.bak_full', src);

// 0) Remove any stray patch/script text that got inserted
src = src
  .replace(/\)\s*`\s*;\s*if\s*$begin:math:text$conditionalRe\\.test\\(src$end:math:text$\)\s*\{[\s\S]*?console\.log$begin:math:text$\\'Patched HomeScreen\\.js.*$/m, '')
  .replace(/if\\s*\\(\\s*conditionalRe\\.test\\(src$end:math:text$\s*\)\s*\{[\s\S]*?\}\s*else\s*if\s*$begin:math:text$[\\s\\S]*?<\\/\\>$end:math:text$\s*`\s*;/g, '')
  .replace(/conditionalRe|goodBlock|src\s*=\s*src\.replace\([^)]*\);?/g, '')
  .replace(/^\)\s*:\s*\($/gm, '')
  .replace(/^\)\s*`\s*;?$/gm, '');

// 1) Ensure React and Animated hooks
if (/import\s+React,\s*\{[^}]*\}\s+from\s+['"]react['"];/m.test(src)) {
  src = src.replace(/import\s+React,\s*\{([^}]*)\}\s+from\s+['"]react['"];/m, (m, inner) => {
    const parts = inner.split(',').map(s=>s.trim()).filter(Boolean);
    if (!parts.includes('useEffect')) parts.push('useEffect');
    if (!parts.includes('useRef')) parts.push('useRef');
    return `import React, { ${Array.from(new Set(parts)).join(', ')} } from 'react';`;
  });
} else if (/import\s+React\s+from\s+['"]react['"];/m.test(src)) {
  src = src.replace(/import\s+React\s+from\s+['"]react['"];/m, (m)=>`${m}\nimport { useEffect, useRef } from 'react';`);
}
if (/import\s+\{[^}]*\}\s+from\s+['"]react-native['"];/m.test(src)) {
  src = src.replace(/import\s+\{([^}]*)\}\s+from\s+['"]react-native['"];/m, (m, inner) => {
    const parts = inner.split(',').map(s=>s.trim()).filter(Boolean);
    if (!parts.includes('Animated')) parts.push('Animated');
    return `import { ${Array.from(new Set(parts)).join(', ')} } from 'react-native';`;
  });
}

// 2) Ensure signedIn
if (!/const\s+signedIn\s*=/.test(src)) {
  src = src.replace(
    /(const\s+nextBill\s*=\s*[^;]+;\s*)/,
    `$1\n  const signedIn = !!(member && member.signedIn);\n`
  );
}

// 3) Ensure fade opacity hook and effect
if (!/quoteOpacity\s*=\s*useRef$begin:math:text$new Animated\\.Value\\(0$end:math:text$\)\.current/.test(src)) {
  src = src.replace(
    /(const\s+signedIn\s*=\s*!!$begin:math:text$[^)]*$end:math:text$;\s*)|(\n\s*const\s+signedIn\s*=.*\n)/,
    (m) => `${m}\n  const quoteOpacity = useRef(new Animated.Value(0)).current;\n`
  );
}
if (!/Animated\.timing$begin:math:text$\\s*quoteOpacity/.test(src)) {
  src = src.replace(
    /(const\\s+quoteOpacity\\s*=\\s*useRef\\(new Animated\\.Value\\(0$end:math:text$\)\.current;\s*)/,
    `$1\n  useEffect(() => {\n    if (signedIn) {\n      try { quoteOpacity.setValue(0); } catch {}\n      Animated.timing(quoteOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }).start();\n    }\n  }, [signedIn]);\n`
  );
}

// 4) Remove any existing Join/Learn or old Rumi block, then insert clean conditional after subcopy
const ctaStartNeedles = [
  '<GlowingGlassButton text="Join today"',
  '<Animated.View style={[styles.rumiWrap'
];
let removed = false;
for (const needle of ctaStartNeedles) {
  const i = src.indexOf(needle);
  if (i !== -1) {
    // remove until after either Learn button or </Animated.View>
    let j = src.indexOf('GlowingGlassButton text="Learn about Membership', i);
    if (j !== -1) j = src.indexOf('/>', j) + 2;
    const k = src.indexOf('</Animated.View>', i);
    const end = (j !== -1 ? j : (k !== -1 ? k + '</Animated.View>'.length : i));
    src = src.slice(0, i) + src.slice(end);
    removed = true;
  }
}
if (!removed) {
  // also try to remove any stray fragment block <>
  const fragI = src.indexOf('<>'); const fragK = src.indexOf('</>', fragI + 2);
  if (fragI !== -1 && fragK !== -1) {
    src = src.slice(0, fragI) + src.slice(fragK + 3);
  }
}

// Find insertion point (after subcopy text)
let insertAt = -1;
{
  const subLine = src.indexOf('style={styles.subcopy}');
  if (subLine !== -1) {
    const close = src.indexOf('</Text>', subLine);
    if (close !== -1) insertAt = close + 7;
  }
}
const block = `
          {signedIn ? (
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

if (insertAt !== -1 && !src.includes('"Let the beauty we love be what we do."')) {
  src = src.slice(0, insertAt) + '\n' + block + '\n' + src.slice(insertAt);
}

// 5) Ensure styles exist
if (!/rumiWrap\s*:/.test(src)) {
  src = src.replace(
    /StyleSheet\.create\(\{\s*/,
    match => match + `
  rumiWrap: { paddingVertical: 30, paddingHorizontal: 20, alignItems: 'center' },
  rumiQuote: { fontSize: 18, fontStyle: 'italic', textAlign: 'center', color: '#fff', marginBottom: 5, fontFamily: 'Fraunces_600SemiBold' },
  rumiAttribution: { fontSize: 14, color: '#ccc' },\n`
  );
}

// 6) Sanity: fix any mistaken closing tags left by earlier edits
//   - ProgressBar should not contain </Animated.View>
src = src.replace(/<\/Animated\.View>/g, '</Animated.View>'); // normalize
const progStart = src.indexOf('function ProgressBar');
if (progStart !== -1) {
  const progEnd = src.indexOf('return', progStart);
  const braceClose = src.indexOf('}', progEnd);
  let seg = src.slice(progStart, braceClose);
  seg = seg.replace(/<\/Animated\.View>/g, '</View>');
  src = src.slice(0, progStart) + seg + src.slice(braceClose);
}

fs.writeFileSync(file, src);
console.log('Repaired HomeScreen.js (backup at .bak_full)');
