const fs = require('fs');

function patchFile(p) {
  if (!fs.existsSync(p)) return false;
  let src = fs.readFileSync(p, 'utf8');

  if (src.includes("KeyboardAwareScrollView")) return true;

  // inject import after first import line
  src = src.replace(
    /import[^\n]*\n/,
    (m) => m + `import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';\n`
  );

  // replace first <ScrollView ...> with KeyboardAwareScrollView (keeps existing props)
  src = src.replace(
    /<ScrollView([^>]*)>/,
    (_, props) =>
      `<KeyboardAwareScrollView enableOnAndroid={true} enableAutomaticScroll={true} keyboardShouldPersistTaps="handled" extraScrollHeight={24}${props || ''}>`
  );

  // replace closing tag
  src = src.replace(/<\/ScrollView>/, '</KeyboardAwareScrollView>');

  fs.writeFileSync(p, src);
  return true;
}

const candidates = [
  'src/screens/MembershipStart.js',
  'src/screens/MembershipStartScreen.js',
  'src/screens/AuthScreen.js',
  'src/screens/Auth.js',
  'MembershipStart.js'
];

let done = false;
for (const p of candidates) {
  if (patchFile(p)) { console.log('patched:', p); done = true; break; }
}

if (!done) {
  console.error('Could not find the Create Account screen. Edit it manually to wrap its <ScrollView> with <KeyboardAwareScrollView>.');
  process.exit(1);
}
