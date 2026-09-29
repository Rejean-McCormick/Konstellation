import { test, expect, gotoReady } from './fixtures.mjs';

const cases = [
  ['Moïse', /Moïse|Moses/i],
  ['ressurection', /Résurrection/i],
  ['Saint-Esprit', /Saint-Esprit/i],
  ['parousie', /Parousie/i],
  ['iconoclaste', /Images et iconoclasme|Iconoclasme/i],
  ['eudiste', /Spiritualité eudiste/i],
];

for (const [term, title] of cases) {
  test(`@astrolabe oriente « ${term} » sans erreur réseau`, async ({ page }) => {
    await gotoReady(page);
    const input = page.getByLabel("Orienter l’Astrolabe");
    await input.fill(term);

    const reading = page.locator('.astrolabe-reading');
    await expect(reading).toBeVisible();
    await expect(reading).toContainText(title);
    await expect(page.getByRole('alert')).toHaveCount(0);

    const capButton = page.getByRole('button', { name: 'Prendre le cap →' });
    if (term !== 'eudiste') {
      await expect(capButton).toBeEnabled();
      await expect(page.locator('.astrolabe-cap').first()).toBeVisible();
    } else {
      await expect(reading).toContainText(/orientation par proximité|Piste voisine/i);
    }
  });
}

test('@astrolabe prendre un cap transforme le mot en sélection Konstellation', async ({ page }) => {
  await gotoReady(page);
  await page.getByLabel("Orienter l’Astrolabe").fill('Moïse');
  await expect(page.locator('.astrolabe-cap').first()).toBeVisible();
  await page.getByRole('button', { name: 'Prendre le cap →' }).click();

  await expect(page.locator('.results-body')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('.active-filters')).toContainText(/1 identit/);
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.result-count')).not.toHaveText('—');
});
