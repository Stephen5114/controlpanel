import { chromium } from 'playwright';
import crypto from 'crypto';

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

const header = base64url(Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
const payload = base64url(Buffer.from(JSON.stringify({
  sub: '03f49f1b-b889-443c-a9a7-25dc3c3cda60',
  email: 'eotiiwtn@gmail.com',
  role: 'customer',
  iss: 'IIS-Site-Manager',
  aud: 'IIS-Site-Manager-Customer',
  exp: Math.floor(Date.now() / 1000) + 86400,
  iat: Math.floor(Date.now() / 1000),
})));

const secret = 'VerySecretJwtKeyForIISSiteManagerThatIsAtLeast32BytesLong!';
const sig = base64url(crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest());
const token = `${header}.${payload}.${sig}`;
const session = JSON.stringify({ customerId: '03f49f1b-b889-443c-a9a7-25dc3c3cda60', email: 'eotiiwtn@gmail.com', token });

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1440, height: 900 });

await page.goto('https://cp.hostvibecoding.com/', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.evaluate((s) => window.localStorage.setItem('customer-control-panel.session', s), session);

// Screenshot subscription root (folder list)
await page.goto('https://cp.hostvibecoding.com/subscription/pro_us_014/files', { waitUntil: 'networkidle', timeout: 20000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: 'C:/Users/ADMINI~1/AppData/Local/Temp/2/claude/files_v2_root.png', fullPage: true });

// Click into first site folder
const cards = await page.$$('.files-workbench__card-main');
if (cards.length > 0) {
  await cards[0].click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'C:/Users/ADMINI~1/AppData/Local/Temp/2/claude/files_v2_site.png', fullPage: true });
}

await browser.close();
console.log('done');
