const fs = require('fs');
const file = 'src/screens/HomeScreen.js';
let s = fs.readFileSync(file,'utf8'); fs.writeFileSync(file+'.bak_hooks', s);

// ensure import
if (!s.includes("useFocusEffect")) {
  s = s.replace(/^(import .*?;\s*)+/s, m => m + "import { useFocusEffect } from '@react-navigation/native';\n");
}

// remove any existing useFocusEffect block (to avoid duplicates)
s = s.replace(/useFocusEffect\(\s*\(\)\s*=>\s*\{\s*[\s\S]*?\}\s*\);\s*/g, '');

// replace the whole useEffect block with a clean one
s = s.replace(/useEffect\([\s\S]*?\)\s*;\s*/, `useEffect(() => {
  let mounted = true;
  (async () => {
    try { const m = await getMembershipSummary(); if (mounted && m) setMember(m); } catch {}
    try { const f = await getFundCurrent(); if (mounted && f) setFund(f); } catch {}
    try { const t = await getToday(); if (mounted) setToday(t); } catch {}
    try { const s2 = await getPayItForward(); if (mounted) setPif(s2); } catch {}
    try { const d = await getFreeDrinkProgress(); if (mounted) setLoyalty(d); } catch {}
  })();
  return () => { mounted = false; };
}, []);\n`);

// add a light focus refresh
if (!s.includes('useFocusEffect(() => {')) {
  s = s.replace(/(\nexport default function HomeScreen[^\{]*\{)/, `$1
  useFocusEffect(() => {
    let active = true;
    (async () => {
      try { const m = await getMembershipSummary(); if (active && m) setMember(m); } catch {}
    })();
    return () => { active = false; };
  });
`);
}

fs.writeFileSync(file, s);
console.log('HomeScreen hooks repaired (backup at .bak_hooks)');
