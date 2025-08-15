const fs = require('fs');
const path = 'src/screens/HomeScreen.js';

if (!fs.existsSync(path)) {
  console.error('Missing file:', path);
  process.exit(1);
}

let src = fs.readFileSync(path, 'utf8');
fs.writeFileSync(path + '.bak', src);

let changed = false;

// 1) Insert `signedIn` after nextBill
if (!src.includes('const signedIn')) {
  const reNextBill = /(const\s+nextBill\s*=\s*[^;]+;\s*)/;
  if (reNextBill.test(src)) {
    src = src.replace(reNextBill, `$1\n  const signedIn = !!member?.signedIn;\n`);
    changed = true;
    console.log('Inserted: const signedIn = !!member?.signedIn;');
  }
}

// 2) Wrap CTAs with signedIn conditional + add Rumi block
if (!src.includes('rumiQuote')) {
  const joinIdx = src.indexOf('<GlowingGlassButton text="Join today"');
  if (joinIdx !== -1) {
    let preStart = src.lastIndexOf('<View style={{ height: 18 }} />', joinIdx);
    if (preStart === -1) preStart = joinIdx;

    const suffixNeedle = 'GlowingGlassButton text="Learn about Membership';
    const learnIdx = src.indexOf(suffixNeedle, joinIdx);
    if (learnIdx !== -1) {
      const afterLearn = src.indexOf('/>', learnIdx);
      if (afterLearn !== -1) {
        const prefix =
`{signedIn ? (
            <View style={styles.rumiWrap}>
              <Text style={styles.rumiQuote}>"Let the beauty we love be what we do."</Text>
              <Text style={styles.rumiAttribution}>— Rumi</Text>
            </View>
          ) : (
            `;
        const suffix = `
          )}`;
        src = src.slice(0, preStart) + prefix + src.slice(preStart, afterLearn + 2) + suffix + src.slice(afterLearn + 2);
        changed = true;
        console.log('Wrapped Join/Learn CTAs with signedIn conditional + Rumi block.');
      }
    }
  }
}

// 3) Add styles for the Rumi quote (if missing)
if (!/rumiWrap\s*:|rumiQuote\s*:|rumiAttribution\s*:/.test(src)) {
  const stylesEnd = src.lastIndexOf('});');
  const stylesStart = src.lastIndexOf('StyleSheet.create({', stylesEnd);
  if (stylesStart !== -1 && stylesEnd !== -1) {
    const insertAt = stylesEnd;
    const styleChunk =
`
  rumiWrap: { paddingVertical: 30, paddingHorizontal: 20, alignItems: 'center' },
  rumiQuote: { fontSize: 18, fontStyle: 'italic', textAlign: 'center', color: '#fff', marginBottom: 5 },
  rumiAttribution: { fontSize: 14, color: '#ccc' },
`;
    src = src.slice(0, insertAt) + styleChunk + src.slice(insertAt);
    changed = true;
    console.log('Added rumiWrap/rumiQuote/rumiAttribution styles.');
  }
}

if (!changed) {
  console.log('No changes applied (patterns not found or already patched).');
} else {
  fs.writeFileSync(path, src);
  console.log('Patched:', path, 'Backup:', path + '.bak');
}
