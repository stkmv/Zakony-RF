const express = require('express');
const cors = require('cors');
const path = require('path');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

const checkPersonalData = require('./checkers/personal-data');
const checkCookies = require('./checkers/cookies');
const checkLocalization = require('./checkers/localization');
const checkContacts = require('./checkers/contacts');
const checkAdvertising = require('./checkers/advertising');
const checkCashier = require('./checkers/cashier');
const checkMessengers = require('./checkers/messengers');
const checkEcommerce = require('./checkers/ecommerce');
const checkAnglicisms = require('./checkers/anglicisms');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/check', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL не указан' });

  let browser;
  const startTime = Date.now();

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,800',
        '--single-process',
        '--no-zygote'
      ]
    });
    const page = await browser.newPage();

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8' });

    const interceptedRequests = [];
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      interceptedRequests.push(request.url());
      request.continue();
    });

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (gotoErr) {
      if (!gotoErr.message.includes('Navigation timeout')) throw gotoErr;
    }
    await page.waitForTimeout(2000).catch(() => {});
    const html = await page.content();
    const $ = cheerio.load(html);

    const data = { url, html, $, requests: interceptedRequests };

    const [pd, cookies, loc, contacts, adv, cashier, mess, ecom, angl] = await Promise.all([
      checkPersonalData(data),
      checkCookies(data),
      checkLocalization(data),
      checkContacts(data),
      checkAdvertising(data),
      checkCashier(data),
      checkMessengers(data),
      checkEcommerce(data),
      checkAnglicisms(data),
    ]);

    const allViolations = [
      ...pd.violations, ...cookies.violations, ...loc.violations,
      ...contacts.violations, ...adv.violations, ...cashier.violations,
      ...mess.violations, ...ecom.violations, ...angl.violations
    ];
    const allPassed = [
      ...pd.passed, ...cookies.passed, ...loc.passed,
      ...contacts.passed, ...adv.passed, ...cashier.passed,
      ...mess.passed, ...ecom.passed, ...angl.passed
    ];

    allViolations.sort((a, b) => b.fine_max - a.fine_max);

    const fine_total_min = allViolations.reduce((s, v) => s + v.fine_min, 0);
    const fine_total_max = allViolations.reduce((s, v) => s + v.fine_max, 0);

    res.json({
      url,
      scan_duration_ms: Date.now() - startTime,
      violations: allViolations,
      passed: allPassed,
      summary: {
        violations_count: allViolations.length,
        fine_total_min,
        fine_total_max
      }
    });

  } catch (err) {
    res.status(500).json({ error: `Ошибка анализа: ${err.message}` });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LawScan сервер запущен: http://localhost:${PORT}`);
});
