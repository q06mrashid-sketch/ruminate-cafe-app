const fs = require('fs');
const file = 'src/screens/HomeScreen.js';
let s = fs.readFileSync(file,'utf8'); fs.writeFileSync(file+'.bak_reactive', s);

// 1) Initial state must include signedIn + tier
s = s.replace(
  /useState\(\{\s*status:\s*'none'[^}]*\}\)/,
  "useState({ signedIn:false, tier:'free', status:'none', next_billing_at:null })"
);

// 2) Compute signedIn from member.signedIn
s = s.replace(/const\s+signedIn\s*=\s*!![^;]+;/, "const signedIn = !!member?.signedIn;");

// 3) Show Paid/Free and renew date (instead of Active/Not a member)
s = s.replace(
  /<Text style=\{\[styles\.sectionValue,[\s\S]*?\}\}>\s*[\s\S]*?<\/Text>/,
  `<Text style={[styles.sectionValue, { color: member?.tier === 'paid' ? palette.clay : palette.coffee }]}>
              {member?.tier === 'paid' ? 'Paid' : 'Free'}
              {member?.tier === 'paid' && nextBill ? \` · renews \${nextBill}\` : ''}
            </Text>`
);

// 4) Ensure focus-refresh on return to Home
if (!s.includes("useFocusEffect")) {
  s = s.replace(/^(import .*?;\s*)+/s, m => m + "import { useFocusEffect } from '@react-navigation/native';\n");
}
if (!s.includes('useFocusEffect(() => {') && s.includes('getMembershipSummary')) {
  s = s.replace(/useEffect\([\s\S]*?\);\s*/, match => match + `
  useFocusEffect(() => {
    let on = true;
    (async () => {
      try { const m = await getMembershipSummary(); if (on && m) setMember(m); } catch {}
    })();
    return () => { on = false; };
  });\n`);
}

// 5) Remove any duplicate extra “Learn about…” button outside the signed-out branch
const learnNeedle = '<GlowingGlassButton text="Learn about Membership & Profit Sharing"';
const first = s.indexOf(learnNeedle), last = s.lastIndexOf(learnNeedle);
if (last !== -1 && last !== first) {
  const start = s.lastIndexOf('\n', last) + 1;
  const end = s.indexOf('\n', s.indexOf('/>', last)) + 1;
  const prevStart = s.lastIndexOf('\n', start - 2) + 1;
  const prevLine = s.slice(prevStart, start);
  s = /height:\s*10/.test(prevLine) ? s.slice(0, prevStart) + s.slice(end) : s.slice(0, start) + s.slice(end);
}

fs.writeFileSync(file, s);
console.log('HomeScreen reactivity fixed (backup at .bak_reactive)');
