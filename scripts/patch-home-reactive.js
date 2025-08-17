const fs = require('fs');
const file = 'src/screens/HomeScreen.js';
let s = fs.readFileSync(file,'utf8'); fs.writeFileSync(file+'.bak_authed', s);

// ensure member shape has signedIn + tier
s = s.replace(
  /useState\(\{\s*status:\s*'none'[^}]*\}\)/,
  "useState({ signedIn: false, tier: 'free', status: 'none', next_billing_at: null })"
);

// compute signedIn from member
s = s.replace(/const\s+signedIn\s*=\s*!![^;]+;/, "const signedIn = !!member?.signedIn;");

// show Paid/Free instead of Active/Not a member
s = s.replace(
  /<Text style=\{\[styles\.sectionValue,[\s\S]*?\}\}>\s*[\s\S]*?<\/Text>/,
  `<Text style={[styles.sectionValue, { color: member?.tier === 'paid' ? palette.clay : palette.coffee }]}>
              {member?.tier === 'paid' ? 'Paid' : 'Free'}
              {member?.tier === 'paid' && nextBill ? \` · renews \${nextBill}\` : ''}
            </Text>`
);

// remove any duplicate Learn button outside the signed-out branch
const learnNeedle = '<GlowingGlassButton text="Learn about Membership & Profit Sharing"';
const first = s.indexOf(learnNeedle);
const last = s.lastIndexOf(learnNeedle);
if (last !== -1 && last !== first) {
  const start = s.lastIndexOf('\n', last) + 1;
  const end = s.indexOf('\n', s.indexOf('/>', last)) + 1;
  // also remove preceding spacer if any
  const prevStart = s.lastIndexOf('\n', start - 2) + 1;
  const prevLine = s.slice(prevStart, start);
  if (/height:\s*10/.test(prevLine)) {
    s = s.slice(0, prevStart) + s.slice(end);
  } else {
    s = s.slice(0, start) + s.slice(end);
  }
}

// keep focus refetch if present; otherwise add a light one
if (!s.includes('useFocusEffect') && s.includes('getMembershipSummary')) {
  s = s.replace(/^(import .*\n)+/, m => m + "import { useFocusEffect } from '@react-navigation/native';\n");
}
if (!s.includes('useFocusEffect(() => {') && s.includes('getMembershipSummary')) {
  s = s.replace(/useEffect\([\s\S]*?\);\s*/, match => match + `
  useFocusEffect(() => {
    let active = true;
    (async () => {
      try { const m = await getMembershipSummary(); if (active && m) setMember(m); } catch {}
    })();
    return () => { active = false; };
  });\n`);
}

fs.writeFileSync(file, s);
console.log('HomeScreen patched for auth-reactive UI (backup created).');
