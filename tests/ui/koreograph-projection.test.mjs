import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/svelte';

import KoreographProjection from '../../src/components/KoreographProjection.svelte';

import fixture from '../../docs/koreograph/examples/specialized/hierarchy.json';
let captured, revoke;
beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })));
  captured = [];
  revoke = vi.fn();
  vi.stubGlobal('URL', class extends URL {
    static createObjectURL(blob) { captured.push(blob); return 'blob:local-test/' + captured.length; }
    static revokeObjectURL(url) { revoke(url); }
  });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test('projection opens in reduced motion, selects themes, changes chapter and exports only with consent', async () => {
  const { container, unmount } = render(KoreographProjection, { data: fixture });
  const ui = within(container);
  await fireEvent.click(ui.getByRole('button', { name: 'Koreograph', exact: true }));
  expect(container.querySelector('svg')).not.toBeNull();
  expect(ui.getByRole('button', { name: 'Lecture' }).disabled).toBe(true);
  expect(ui.getByRole('button', { name: 'SVG du chapitre' }).disabled).toBe(true);
  await fireEvent.change(ui.getByLabelText('Thème'), { target: { value: 'paper' } });
  await fireEvent.click(ui.getByRole('button', { name: 'Chapitre suivant' }));
  expect(ui.getByRole('button', { name: 'Chapitre précédent' }).disabled).toBe(false);
  await fireEvent.click(ui.getByRole('checkbox'));
  await fireEvent.click(ui.getByRole('button', { name: 'SVG du chapitre' }));
  expect(await ui.findByRole('link', { name: 'koreograph-projection.chapter.svg' })).not.toBeNull();
  expect(captured).toHaveLength(2);
  expect(ui.getByRole('link', { name: 'koreograph-projection.chapter.svg.receipt.json' })).not.toBeNull();
  await fireEvent.click(ui.getByRole('checkbox'));
  expect(ui.queryByRole('link')).toBeNull();
  expect(revoke).toHaveBeenCalledTimes(2);
  unmount();
});

