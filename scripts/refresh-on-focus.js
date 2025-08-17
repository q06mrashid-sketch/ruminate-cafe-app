const fs = require('fs');
const file = 'src/screens/HomeScreen.js';
let s = fs.readFileSync(file,'utf8'); fs.writeFileSync(file+'.bak_focus', s);

// add useFocusEffect import
if (!s.includes("useFocusEffect")) {
  if (s.includes("from '@react-navigation/native'")) {
    s = s.replace(/from '@react-navigation\/native';/, "from '@react-navigation/native';\nimport { useFocusEffect } from '@react-navigation/native';");
  } else {
    s = s.replace(/^(import .*\n)+/, m => m + "import { useFocusEffect } from '@react-navigation/native';\n");
  }
}

// add focus refetch
if (!s.includes('useFocusEffect(() => {') && s.includes('getMembershipSummary')) {
  const block = `
  useFocusEffect(() => {
    let active = true;
    (async () => {
      try { const m = await getMembershipSummary(); if (active && m) setMember(m); } catch {}
      try { const f = await getFundCurrent(); if (active && f) setFund(f); } catch {}
      try { const t = await getToday(); if (active) setToday(t); } catch {}
      try { const s2 = await getPayItForward(); if (active) setPif(s2); } catch {}
      try { const d = await getFreeDrinkProgress(); if (active) setLoyalty(d); } catch {}
    })();
    return () => { active = false; };
  });`;
  s = s.replace(/useEffect\([\s\S]*?\);\s*/, m => m + '\n' + block + '\n');
}

fs.writeFileSync(file, s);
console.log('Patched focus refetch in HomeScreen.js');
