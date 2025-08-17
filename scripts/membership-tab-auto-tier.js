const fs = require('fs');
const file = 'src/screens/MembershipScreen.js';
let s = fs.readFileSync(file,'utf8'); fs.writeFileSync(file+'.bak_tier', s);

// import summary + focus hook
if (!/getMembershipSummary/.test(s)) {
  s = s.replace(/from '\.\.\/design\/theme';/, "from '../design/theme';\nimport { getMembershipSummary } from '../services/membership';");
}
if (!/useFocusEffect/.test(s)) {
  if (/from '@react-navigation\/native'/.test(s)) {
    s = s.replace(/from '@react-navigation\/native';/, "from '@react-navigation/native';\nimport { useFocusEffect } from '@react-navigation/native';");
  } else {
    s = s.replace(/^(import .*\n)+/, m => m + "import { useFocusEffect } from '@react-navigation/native';\n");
  }
}

// add signedIn state
if (!/const\s*\[\s*signedIn/.test(s)) {
  s = s.replace(/const\s*\[\s*tier\s*,\s*setTier\s*\][^;]*;/, "$&\n  const [signedIn, setSignedIn] = useState(false);");
}

// add focus-driven tier detection
if (!/useFocusEffect\(\(\)\s*=>\s*\{/.test(s)) {
  const block = `
  useFocusEffect(() => {
    let on = true;
    (async () => {
      try {
        const m = await getMembershipSummary();
        if (!on || !m) return;
        const paid = m.status === 'active' || m.tier === 'paid';
        setSignedIn(!!m?.signedIn || !!m?.status || !!m?.tier);
        setTier(paid ? 'paid' : 'free');
      } catch {}
    })();
    return () => { on = false; };
  });`;
  s = s.replace(/export default function MembershipScreen\([^)]*\)\s*\{/, m => m + block);
}

// hide CTAs when signed in (paid)
s = s.replace(
  /<View style=\{\{ height: 16 \}\} \}\/>\s*\n\s*<Pressable[^>]*>\s*<Text[^>]*>Join with Apple Pay<\/Text>\s*<\/Pressable>/,
  "{!signedIn && (<><View style={{ height: 16 }} /><Pressable style={[styles.cta, styles.ctaPrimary]} onPress={() => navigation.navigate('MembershipStart')}><Text style={styles.ctaPrimaryText}>Join with Apple Pay</Text></Pressable></>)}"
);

// hide CTAs when signed in (free)
s = s.replace(
  /<View style=\{\{ height: 16 \}\} \}\/>\s*\n\s*<Pressable[^>]*>\s*<Text[^>]*>Create loyalty card<\/Text>\s*<\/Pressable>/,
  "{!signedIn && (<><View style={{ height: 16 }} /><Pressable style={[styles.cta, styles.ctaSecondary]} onPress={() => navigation.navigate('MembershipStart', { mode: 'free' })}><Text style={styles.ctaSecondaryText}>Create loyalty card</Text></Pressable></>)}"
);

fs.writeFileSync(file, s);
console.log('Patched MembershipScreen.js: auto-tier + hide CTAs when signed in');
