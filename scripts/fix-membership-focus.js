const fs = require('fs');
const file = 'src/screens/MembershipScreen.js';
let s = fs.readFileSync(file,'utf8'); fs.writeFileSync(file+'.bak_focus', s);

// Import useFocusEffect if missing
if (!s.includes("useFocusEffect")) {
  s = s.replace(/^(import .*?;\s*)+/s, m => m + "import { useFocusEffect } from '@react-navigation/native';\n");
}

// Add focus-driven refresh of summary + stats + user
if (!s.includes('useFocusEffect(() => {')) {
  s = s.replace(/useEffect\([\s\S]*?\);\s*/, match => match + `
  useFocusEffect(() => {
    let on = true;
    (async () => {
      try { const m = await getMembershipSummary(); if (on && m) setSummary(m); } catch {}
      try { const s2 = await getMyStats(); if (on) setStats(s2); } catch {}
      try { const u = await supabase.auth.getUser(); if (on) setUser(u.data.user || null); } catch {}
    })();
    return () => { on = false; };
  });\n`);
}

fs.writeFileSync(file, s);
console.log('MembershipScreen focus refresh added (backup at .bak_focus)');
