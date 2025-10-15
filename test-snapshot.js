import { chromium } from 'playwright';

async function takeSnapshot() {
  console.log('🚀 Lancement du navigateur avec Playwright...');

  // Lancer le navigateur
  const browser = await chromium.launch({
    headless: false,
    args: ['--remote-debugging-port=9222'],
  });

  console.log('📱 Création d une nouvelle page...');
  const page = await browser.newPage();

  // Naviguer vers un site web
  console.log('🌐 Navigation vers https://www.google.com...');
  await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });

  // Attendre un peu pour que la page se charge complètement
  await page.waitForTimeout(2000);

  // Prendre un screenshot
  console.log('📸 Prise de screenshot...');
  await page.screenshot({ path: 'google-snapshot.png', fullPage: true });

  console.log('✅ Snapshot sauvegardé dans google-snapshot.png');

  // Garder le navigateur ouvert pour que l extension puisse se connecter
  console.log('🔄 Le navigateur reste ouvert pour la connexion MCP...');

  // Ne pas fermer le navigateur immédiatement
  // await browser.close();
}

takeSnapshot().catch(console.error);
