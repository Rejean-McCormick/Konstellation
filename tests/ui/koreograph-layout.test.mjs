import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/svelte';
import KoreographProjection from '../../src/components/KoreographProjection.svelte';
import fixture from '../../docs/koreograph/examples/specialized/hierarchy.json';

let background, alreadyInert;
afterEach(() => { cleanup(); background?.remove(); alreadyInert?.remove(); vi.unstubAllGlobals(); });

test('presentation keeps the live specialized reader and restores background on Escape or unmount', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener() {}, removeEventListener() {} })));
  background = document.createElement('button'); background.textContent = 'Background'; document.body.append(background);
  alreadyInert = document.createElement('aside'); alreadyInert.setAttribute('inert',''); document.body.append(alreadyInert);
  const { container, unmount } = render(KoreographProjection, { data: fixture });
  const ui = within(container);
  await fireEvent.click(ui.getByRole('button',{name:'Koreograph',exact:true}));
  const root = container.querySelector('.kg-specialized'), svg = root.querySelector('svg');
  const button = ui.getByRole('button',{name:'Mode présentation',exact:true});
  await fireEvent.click(button);
  expect(root.classList.contains('kg-presenting')).toBe(true);
  expect(root.getAttribute('aria-modal')).toBe('true');
  expect(button.textContent).toBe('Quitter la présentation');
  expect(background.hasAttribute('inert')).toBe(true);
  expect(root.querySelector('svg')).toBe(svg);
  await fireEvent.keyDown(document,{key:'Escape'});
  expect(root.classList.contains('kg-presenting')).toBe(false);
  expect(root.hasAttribute('aria-modal')).toBe(false);
  expect(background.hasAttribute('inert')).toBe(false);
  expect(alreadyInert.hasAttribute('inert')).toBe(true);
  await fireEvent.click(button);
  unmount();
  expect(background.hasAttribute('inert')).toBe(false);
  expect(alreadyInert.hasAttribute('inert')).toBe(true);
});
