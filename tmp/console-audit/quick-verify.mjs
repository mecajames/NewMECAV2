import puppeteer from 'puppeteer';

const MAGIC = 'https://dbprod.mecacaraudio.com/auth/v1/verify?token=d3b80bd2947029d29f07a9e8c09fdde98befdfc34ad6cfe52cb30fa8&type=magiclink&redirect_to=https://mecacaraudio.com';
const routes = ['/admin/business-listings', '/host-event'];

async function run() {
  console.log('launching...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  console.log('launched');
  const page = await browser.newPage();
  console.log('newPage');
  await page.setRequestInterception(true);
  console.log('interception on');
  page.on('request', r => {
    const m = r.method();
    if (m === 'DELETE' || m === 'PUT' || m === 'PATCH') return r.abort('failed');
    r.continue();
  });

  const issues = {};
  let current = '(init)';
  page.on('console', m => {
    const t = m.type();
    if (t !== 'error' && t !== 'warning') return;
    (issues[current] ??= []).push(`[${t}] ${m.text().substring(0, 200)}`);
  });
  page.on('response', r => {
    if (r.status() < 400) return;
    (issues[current] ??= []).push(`[http${r.status()}] ${r.url().substring(0, 200)}`);
  });
  page.on('pageerror', e => {
    (issues[current] ??= []).push(`[pageerror] ${e.message.substring(0, 200)}`);
  });

  console.log('visiting magic link...');
  await page.goto(MAGIC, { waitUntil: 'networkidle2', timeout: 30000 });
  console.log('magic link visited');
  await new Promise(r => setTimeout(r, 2000));
  const hasSession = await page.evaluate(() => Object.keys(localStorage).some(k => k.includes('auth-token')));
  console.log('session:', hasSession);

  for (const r of routes) {
    current = r;
    console.log('visiting', r);
    try {
      await page.goto(`https://mecacaraudio.com${r}`, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(res => setTimeout(res, 2000));
    } catch (e) {
      (issues[current] ??= []).push(`[nav-fail] ${e.message}`);
    }
  }

  await browser.close();
  console.log('\n=== RESULTS ===');
  for (const [route, probs] of Object.entries(issues)) {
    console.log(`\n${route} (${probs.length} issues):`);
    probs.slice(0, 20).forEach(p => console.log('  ' + p));
  }
}

run().catch(e => {
  console.error('FATAL:', e.message, e.stack);
  process.exit(1);
});
