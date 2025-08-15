
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const QRCode = require('qrcode');

const members = [
  { id: 'M001', name: 'Aisha Khan', drinks: 3 },
  { id: 'M002', name: 'Omar Rahman', drinks: 2 },
  { id: 'M003', name: 'Fatima Ali', drinks: 1 },
  { id: 'M004', name: 'Zain Siddiqui', drinks: 0 },
  { id: 'M005', name: 'Layla Yusuf', drinks: 0 }
];

const template = fs.readFileSync('./mock-wallet-passes/template-pass.json', 'utf8');

async function generate() {
  const qrDir = path.join(__dirname, 'mock-qr-codes');
  const passDir = path.join(__dirname, 'mock-wallet-passes');

  if (!fs.existsSync(qrDir)) fs.mkdirSync(qrDir, { recursive: true });
  if (!fs.existsSync(passDir)) fs.mkdirSync(passDir, { recursive: true });

  for (const m of members) {
    const passData = template
      .replace('SERIAL_PLACEHOLDER', m.id)
      .replace('NAME_PLACEHOLDER', m.name)
      .replace('DRINKS_PLACEHOLDER', String(m.drinks))
      .replace('ID_PLACEHOLDER', m.id);

    const memberPassFolder = path.join(passDir, m.id);
    if (!fs.existsSync(memberPassFolder)) fs.mkdirSync(memberPassFolder, { recursive: true });

    fs.writeFileSync(path.join(memberPassFolder, 'pass.json'), passData, 'utf8');

    await QRCode.toFile(path.join(qrDir, `${m.id}.png`), m.id);

    const output = fs.createWriteStream(path.join(passDir, `${m.id}.pkpass`));
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(output);
    archive.directory(memberPassFolder + '/', false);
    await archive.finalize();
  }

  console.log('✅ Mock passes & QR codes generated in mock-wallet-passes/ and mock-qr-codes/');
}

generate().catch(err => {
  console.error('❌ Generation failed:', err);
  process.exit(1);
});

