import { test, expect, entityMatches } from './fixtures.mjs';

async function bootstrap(request) {
  const response = await request.get('/api/bootstrap');
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test('@corpus le Biblical Graph expose personnes, œuvres, concepts et traditions', async ({ request }) => {
  const boot = await bootstrap(request);
  const byType = (type) => boot.entities.filter((entity) => entity.type === type);

  expect(byType('person').length, 'personnes/personnages bibliques').toBeGreaterThanOrEqual(20);
  expect(byType('work').length, 'œuvres bibliques et para-bibliques').toBeGreaterThanOrEqual(100);
  expect(byType('concept').length, 'concepts de navigation').toBeGreaterThanOrEqual(5);
  expect(byType('tradition').length, 'traditions canoniques').toBeGreaterThanOrEqual(3);
});

test('@corpus les caps bibliques essentiels sont réellement indexés', async ({ request }) => {
  const boot = await bootstrap(request);
  const expected = ['Moïse', 'Hénoch', 'Isaïe', 'Paul de Tarse', 'Pierre', 'Saint-Esprit', 'Résurrection', 'Parousie', 'Iconoclasme'];

  for (const term of expected) {
    expect(
      boot.entities.some((entity) => entityMatches(entity, term)),
      `entrée ou alias manquant : ${term}`,
    ).toBeTruthy();
  }
});

test('@corpus les œuvres canoniques et apocryphes clés sont présentes', async ({ request }) => {
  const boot = await bootstrap(request);
  const works = boot.entities.filter((entity) => entity.type === 'work');
  for (const term of ['Genèse', 'Évangile selon Matthieu', '1 Hénoch', 'Évangile de Thomas', 'Didachè']) {
    expect(works.some((entity) => entityMatches(entity, term)), `œuvre manquante : ${term}`).toBeTruthy();
  }
});

test('@corpus-full vérifie BibleData lorsqu’il est réellement chargé', async ({ request }) => {
  const boot = await bootstrap(request);
  const people = boot.entities.filter((entity) => entity.type === 'person');
  test.skip(
    people.length < 3000,
    `BibleData complet non chargé (${people.length} personnes) : le corpus de base reste testable.`,
  );
  expect(people.length, 'BibleData complet devrait contenir au moins 3000 figures').toBeGreaterThanOrEqual(3000);
});
