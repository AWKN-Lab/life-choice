import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
});
const page = await context.newPage();
page.on('console', (msg) => console.log(`[browser ${msg.type()}]`, msg.text()));
page.on('pageerror', (err) => console.log('[browser error]', err.message));

await page.goto('https://awkn.cn/life/kline', { waitUntil: 'networkidle' });
await page.waitForTimeout(3000);

const url = page.url();
const title = await page.title();
const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
console.log('URL:', url);
console.log('Title:', title);
console.log('Body text:', bodyText);

await page.screenshot({ path: 'c:/Users/10919/Desktop/AWKN-Lab/kline-screenshot.png', fullPage: true });
console.log('Screenshot saved');

await browser.close();
