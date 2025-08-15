import fs from 'fs';

const p = 'src/navigation/Router.js';
if (!fs.existsSync(p)) {
  console.error('Router.js not found at src/navigation/Router.js');
  process.exit(1);
}
let s = fs.readFileSync(p, 'utf8');

if (!s.includes('LoyaltyCardCreateScreen')) {
  s = `import LoyaltyCardCreateScreen from "../screens/LoyaltyCardCreateScreen";\n` + s;
}
if (!/name=["']LoyaltyCardCreate["']/.test(s)) {
  s = s.replace(
    /(<Stack\.Navigator[^>]*>)/,
    `$1\n        <Stack.Screen name="LoyaltyCardCreate" component={LoyaltyCardCreateScreen} options={{ title: 'Create loyalty card' }} />`
  );
}
fs.writeFileSync(p, s);
console.log('Router patched with LoyaltyCardCreate screen.');
