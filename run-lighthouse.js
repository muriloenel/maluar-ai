const globalModules = require('child_process').execSync('npm root -g').toString().trim();
const lhModule = require(require('path').join(globalModules, 'lighthouse'));
const lighthouse = lhModule.default || lhModule;
const chromeLauncher = require(require('path').join(globalModules, 'lighthouse', 'node_modules', 'chrome-launcher'));

async function run() {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu'],
    chromePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  });

  console.log(`Chrome running on port ${chrome.port}`);

  const result = await lighthouse('https://maluar-ai.vercel.app', {
    port: chrome.port,
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    output: ['json', 'html'],
  });

  // Save reports
  const fs = require('fs');
  fs.writeFileSync('./lighthouse-report.json', result.report[0]);
  fs.writeFileSync('./lighthouse-report.html', result.report[1]);

  // Print scores
  const categories = result.lhr.categories;
  console.log('\n=== LIGHTHOUSE SCORES ===');
  for (const [key, cat] of Object.entries(categories)) {
    console.log(`${cat.title}: ${Math.round(cat.score * 100)}%`);
  }

  // Print key metrics
  const audits = result.lhr.audits;
  console.log('\n=== CORE WEB VITALS ===');
  console.log(`FCP: ${audits['first-contentful-paint']?.displayValue || 'N/A'}`);
  console.log(`LCP: ${audits['largest-contentful-paint']?.displayValue || 'N/A'}`);
  console.log(`TBT: ${audits['total-blocking-time']?.displayValue || 'N/A'}`);
  console.log(`CLS: ${audits['cumulative-layout-shift']?.displayValue || 'N/A'}`);
  console.log(`SI:  ${audits['speed-index']?.displayValue || 'N/A'}`);

  // Print failed audits
  console.log('\n=== PROBLEMAS ENCONTRADOS ===');
  for (const [key, audit] of Object.entries(audits)) {
    if (audit.score !== null && audit.score < 0.9 && audit.displayValue) {
      console.log(`  [${Math.round(audit.score * 100)}] ${audit.title}: ${audit.displayValue}`);
    }
  }

  // Kill Chrome - catch EPERM
  try {
    await chrome.kill();
  } catch (e) {
    console.log('\n(Chrome cleanup warning - ignorado)');
  }
}

run().catch(e => { console.error(e); process.exit(1); });
