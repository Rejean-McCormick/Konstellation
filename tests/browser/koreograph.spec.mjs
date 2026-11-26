import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';

test.use({ video: 'off' });

test('Koreograph follows visible nodes and exports a standalone HTML player', async ({ page, request }, info) => {
  const boot = await (await request.get('/api/bootstrap')).json();
  test.skip(boot.koreographAvailable !== true, 'Enable local Koreograph for this browser test');
  await page.addInitScript(() => {
    // Keep the actual exported Blob available to inspect independently of the
    // automation binary's download transport.
    const create = URL.createObjectURL.bind(URL);
    window.koreographBlobs = new Map();
    URL.createObjectURL = blob => {
      const url = create(blob);
      window.koreographBlobs.set(url, blob);
      return url;
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /Constellation/ }).click();
  await page.locator('.constellation-node').first().click();
  const panel = page.getByRole('region', { name: 'Koreograph' });
  await panel.getByRole('button', { name: 'Koreograph', exact: true }).click();
  await panel.getByRole('button', { name: 'Kapture' }).click();
  const navigation = page.waitForResponse(res => new URL(res.url()).pathname === '/api/constellation' && res.ok());
  await page.locator('.constellation-node').first().click();
  await navigation;
  await expect(panel.getByRole('textbox', { name: 'Partition JSON' })).toHaveValue(/"follow"/u);
  await panel.getByRole('button', { name: 'Terminer la capture' }).click();
  await panel.getByRole('button', { name: 'Préparer le rejeu' }).click();
  await expect(panel.locator('svg')).toBeVisible();
  const time = panel.getByRole('slider', { name: 'Position temporelle' });
  await time.focus();
  await time.press('End');
  await expect(panel.getByRole('status').first()).toContainText(/\d+\.\d+ \/ \d+\.\d+ s/u);
  await panel.getByRole('checkbox').check();
  await panel.getByRole('button', { name: 'HTML', exact: true }).click();
  const htmlLink = panel.getByRole('link', { name: 'koreograph.html', exact: true });
  const receiptLink = panel.getByRole('link', { name: 'koreograph.html.receipt.json', exact: true });
  await expect(htmlLink).toHaveAttribute('download', 'koreograph.html');
  await expect(receiptLink).toHaveAttribute('download', 'koreograph.html.receipt.json');
  const content = link => link.evaluate(element => window.koreographBlobs.get(element.href).text());
  const path = info.outputPath('export.html');
  await writeFile(path, await content(htmlLink));
  const metadata = JSON.parse(await content(receiptLink));
  expect(metadata.output.format).toBe('html');

  const offline = await page.context().newPage();
  const errors = [];
  offline.on('pageerror', error => errors.push(error.message));
  offline.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const network = [];
  offline.on('request', r => { if (r.url().startsWith('http')) network.push(r.url()); });
  await offline.goto(pathToFileURL(path).href);
  await expect(offline.locator('#stage svg')).toBeVisible();
  const before = await offline.locator('#stage').textContent();
  await offline.getByRole('slider').focus();
  await offline.getByRole('slider').press('End');
  await expect.poll(() => offline.locator('#stage').textContent()).not.toBe(before);
  await panel.getByRole('button', { name: 'PNG', exact: true }).click();
  const png = panel.getByRole('link', { name: 'koreograph.png', exact: true });
  await expect(png).toBeVisible();
  const signature = await png.evaluate(async element => [...new Uint8Array(await window.koreographBlobs.get(element.href).slice(0, 8).arrayBuffer())]);
  expect(signature).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

  await panel.getByRole('button', { name: 'SVG animé', exact: true }).click();
  const svgLink = panel.getByRole('link', { name: 'koreograph.animated.svg', exact: true });
  await expect(svgLink).toBeVisible();
  const svgPath = info.outputPath('animated.svg');
  await writeFile(svgPath, await content(svgLink));
  await offline.goto(pathToFileURL(svgPath).href);
  const visibleFrames = () => offline.locator('svg').evaluate(svg => {
    svg.pauseAnimations();
    svg.setCurrentTime(600);
    return [...svg.children].filter(group => getComputedStyle(group).visibility === 'visible').length;
  });
  await expect.poll(visibleFrames).toBe(1);
  expect(errors).toEqual([]);
  expect(network).toEqual([]);
});
