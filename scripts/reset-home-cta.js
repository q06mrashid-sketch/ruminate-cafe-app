const fs = require('fs');
const file = 'src/screens/HomeScreen.js';
if (!fs.existsSync(file)) { console.error('Missing', file); process.exit(1); }
let src = fs.readFileSync(file, 'utf8');
fs.writeFileSync(file + '.bak_cta_reset', src);

const goodBlock = `
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
          )}`.trim();

// 1) Ensure imports (React hooks + Animated)
function ensureImports(code) {
  // React import
  code = code.replace(
    /import\s+React,\s*\{([^}]*)\}\s+from\s+['"]react['"];/,
    (m, inner) => {
      const parts = inner.split(',').map(s=>s.trim()).filter(Boolean);
      if (!parts.includes('useEffect')) parts.push('useEffect');
      if (!parts.includes('useRef')) parts.push('useRef');
      return `import React, { ${Array.from(new Set(parts)).join(', ')} } from 'react';`;
    }
  );
  if (/import\s+React\s+from\s+['"]react['"];/.test(code) &&
      !/useEffect|useRef/.test(code)) {
    code = code.replace(
      /import\s+React\s+from\s+['"]react['"];/,
      m => `${m}\nimport { useEffect, useRef } from 'react';`
    );
  }

  // RN import
  code = code.replace(
    /import\s+\{([^}]*)\}\s+from\s+['"]react-native['"];/,
    (m, inner) => {
      const parts = inner.split(',').map(s=>s.trim()).filter(Boolean);
      if (!parts.includes('Animated')) parts.push('Animated');
      return `import { ${Array.from(new Set(parts)).join(', ')} } from 'react-native';`;
    }
  );
  return code;
}

// 2) Ensure `signedIn`, `quoteOpacity` and fade effect exist
function ensureStateBits(code) {
  if (!/const\s+signedIn\s*=/.test(code)) {
    code = code.replace(
      /(const\s+nextBill\s*=\s*[^;]+;\s*)/,
      `$1\n  const signedIn = !!(member && member.signedIn);\n`
    );
  }
  if (!/quoteOpacity\s*=\s*useRef\(new Animated\.Value\(0\)\)\.current/.test(code)) {
    code = code.replace(
      /(const\s+signedIn\s*=\s*[^;]+;\s*)/,
      `$1\n  const quoteOpacity = useRef(new Animated.Value(0)).current;\n`
    );
  }
  if (!/Animated\.timing\(\s*quoteOpacity/.test(code)) {
    code = code.replace(
      /(const\s+quoteOpacity\s*=\s*useRef\(new Animated\.Value\(0\)\)\.current;\s*)/,
      `$1\n  useEffect(() => {\n    if (signedIn) {\n      try { quoteOpacity.setValue(0); } catch {}\n      Animated.timing(quoteOpacity, { toValue: 1, duration: 1000, useNativeDriver: true }).start();\n    }\n  }, [signedIn]);\n`
    );
  }
  return code;
}

// 3) Replace the whole `{ signedIn ? (...) : (...) }` block if we can match it cleanly
let replaced = false;
{
  const reBlock = /\{\s*signedIn\s*\?\s*\([\s\S]*?\)\s*:\s*\([\s\S]*?\)\s*\}/m;
  if (reBlock.test(src)) {
    src = src.replace(reBlock, goodBlock);
    replaced = true;
  }
}

// 4) If code is currently broken, remove from `{signedIn ?` to the next line containing `)}` and insert good block
if (!replaced) {
  const start = src.search(/\{\s*signedIn\s*\?\s*\(/);
  if (start !== -1) {
    let cursor = start;
    let end = -1;
    const max = src.length;
    while (cursor < max) {
      const i = src.indexOf(')}', cursor);
      if (i === -1) break;
      end = i + 2;
      // Heuristic: the ternary usually ends at a line closing with `)}`
      // Stop at the first plausible closing.
      break;
    }
    if (end !== -1) {
      src = src.slice(0, start) + goodBlock + src.slice(end);
      replaced = true;
    }
  }
}

// 5) If we still didn't replace, insert after subcopy text
if (!replaced) {
  const subIdx = src.indexOf('style={styles.subcopy}');
  if (subIdx !== -1) {
    const close = src.indexOf('</Text>', subIdx);
    if (close !== -1) {
      const insertAt = close + 7;
      src = src.slice(0, insertAt) + '\n' + goodBlock + '\n' + src.slice(insertAt);
      replaced = true;
    }
  }
}

src = ensureImports(src);
src = ensureStateBits(src);

// 6) Ensure styles exist
if (!/rumiWrap\s*:/.test(src)) {
  src = src.replace(
    /StyleSheet\.create\(\{\s*/,
    m => m + `
  rumiWrap: { paddingVertical: 30, paddingHorizontal: 20, alignItems: 'center' },
  rumiQuote: { fontSize: 18, fontStyle: 'italic', textAlign: 'center', color: '#fff', marginBottom: 5, fontFamily: 'Fraunces_600SemiBold' },
  rumiAttribution: { fontSize: 14, color: '#ccc' },\n`
  );
}

// 7) Clean obvious leftover broken lines like stray '/>' or dangling fragments
src = src.replace(/^\s*\/>\s*$/gm, '');         // kill lone "/>"
src = src.replace(/^\s*<>\s*<\/>\s*$/gm, '');   // empty fragments

fs.writeFileSync(file, src);
console.log(replaced ? 'CTA block repaired' : 'CTA block inserted');
console.log('Backup at', file + '.bak_cta_reset');
