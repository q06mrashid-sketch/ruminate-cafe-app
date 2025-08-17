const fs = require('fs');
const file = 'src/screens/MembershipStartScreen.js';
let s = fs.readFileSync(file,'utf8'); fs.writeFileSync(file+'.bak_nav', s);

// ensure navigation hook import
if (!/useNavigation/.test(s)) {
  if (/from '@react-navigation\/native'/.test(s)) {
    s = s.replace(/from '@react-navigation\/native';/, "from '@react-navigation/native';\nimport { useNavigation } from '@react-navigation/native';");
  } else {
    s = s.replace(/^(import .*\n)+/, m => m + "import { useNavigation } from '@react-navigation/native';\n");
  }
}

// inject navigation instance
if (!/const\s+navigation\s*=\s*useNavigation\(\)/.test(s)) {
  s = s.replace(/export default function MembershipStartScreen\(\) \{/, "export default function MembershipStartScreen() {\n  const navigation = useNavigation();");
}

// on sign-in success -> go Home
s = s.replace(/else Alert\.alert\([^)]*\);/, "else { Alert.alert('Welcome back', 'Signed in successfully.'); navigation.navigate('Home'); }");

// on free create success -> go Home
s = s.replace(/Alert\.alert\('Loyalty card created'[\s\S]*?\);\s*\}/, "Alert.alert('Loyalty card created', 'You can start collecting stamps immediately.'); navigation.navigate('Home'); }");

// on paid create success -> go Home (placeholder payment)
s = s.replace(/Alert\.alert\('Membership',[^;]*\);/, "Alert.alert('Membership', 'Apple Pay / Stripe PaymentSheet would open here in the dev build.'); navigation.navigate('Home');");

fs.writeFileSync(file, s);
console.log('Patched MembershipStartScreen.js to navigate Home after auth');
