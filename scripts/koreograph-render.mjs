import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { link, mkdtemp, open, rm, stat, writeFile } from 'node:fs/promises';
import { resolve, dirname, extname, join } from 'node:path';
import { chromium } from '@playwright/test';
import { BUNDLE_BYTES, canonical, digest, validateBundle } from '../src/lib/koreograph/contracts.mjs';
import { frameAt, renderSvg } from '../src/lib/koreograph/frame.mjs';

process.umask(0o077);

const MAX_BYTES = 2 * 1024 ** 3;
const FPS = 30;
const [input, requested, ...options] = process.argv.slice(2);
const mode = requested && extname(requested).slice(1).toLowerCase();
const permits = new Set(['--private', '--time', '--receipt']);
const option = flag => options[options.indexOf(flag) + 1];
const flagValues = ['--time', '--receipt'];
const optionFlags = options.filter((_, index) => !flagValues.includes(options[index - 1]));
if (!input || !requested || !['png', 'mp4', 'webm'].includes(mode) ||
    !options.includes('--private') || optionFlags.some(flag => !permits.has(flag)) ||
    flagValues.some(flag => options.includes(flag) && (!option(flag) || option(flag).startsWith('--')))) {
  console.error('Usage: node scripts/koreograph-render.mjs bundle.json output.png|mp4|webm --private [--time 0] [--receipt file.json]');
  process.exit(2);
}

const controller = new AbortController();
const cancel = () => controller.abort();
process.once('SIGINT', cancel);
process.once('SIGTERM', cancel);
const deadline = setTimeout(cancel, 12 * 60_000);
const target = resolve(requested);
const scratch = await mkdtemp(join(dirname(target), '.koreograph-'));
let browser;
let encoder;
let encoded;
let outputLinked = false;
let receiptLinked = false;
const result = join(scratch, 'render.' + mode);
const sidecar = join(scratch, 'receipt.json');

async function readBounded(path) {
  const handle = await open(path, 'r');
  try {
    if ((await handle.stat()).size > BUNDLE_BYTES) throw Error('KOR_INVALID_BUNDLE');
    const bytes = Buffer.alloc(BUNDLE_BYTES + 1);
    let offset = 0;
    while (offset < bytes.length) {
      const { bytesRead } = await handle.read(bytes, offset, bytes.length - offset);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset === bytes.length) throw Error('KOR_INVALID_BUNDLE');
    return JSON.parse(bytes.subarray(0, offset).toString('utf8'));
  } finally { await handle.close(); }
}

try {
  const bundle = validateBundle(await readBounded(input));
  const bundleDigest = await digest(canonical(bundle));
  const prior = options.includes('--receipt') ? await readBounded(option('--receipt')) : null;
  if (prior && prior.bundleDigest !== bundleDigest) throw Error('KOR_RECEIPT_MISMATCH');
  const time = options.includes('--time') ? Number(option('--time')) : 0;
  if (!Number.isFinite(time) || time < 0 || time > bundle.durationMs) throw Error('KOR_INVALID_TIME');
  const scale = 1920 / Math.max(bundle.viewport.width, bundle.viewport.height);
  const width = Math.round(bundle.viewport.width * scale / 2) * 2;
  const height = Math.round(bundle.viewport.height * scale / 2) * 2;
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    headless: true,
    args: ['--disable-dev-shm-usage'],
  });
  const browserVersion = browser.version();
  controller.signal.addEventListener('abort', () => { void browser.close().catch(() => {}); }, { once: true });
  controller.signal.throwIfAborted();
  const context = await browser.newContext({ viewport: { width, height }, offline: true, serviceWorkers: 'block' });
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  await page.setContent('<!doctype html><meta charset="utf-8"><style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style><div id="stage"></div>');
  async function capture(at) {
    controller.signal.throwIfAborted();
    const svg = renderSvg(bundle, frameAt(bundle, at));
    await page.evaluate(async markup => {
      const xml = new DOMParser().parseFromString(markup, 'image/svg+xml');
      document.querySelector('#stage').replaceChildren(document.importNode(xml.documentElement, true));
      await document.fonts.ready;
      await new Promise(requestAnimationFrame);
    }, svg);
    return page.screenshot({ type: 'png', timeout: 10_000 });
  }
  let frameCount = 1;
  if (mode === 'png') {
    await writeFile(result, await capture(time), { mode: 0o600, flag: 'wx' });
  } else {
    const codec = mode === 'mp4' ? 'libx264' : 'libvpx-vp9';
    encoder = spawn(process.env.KOREOGRAPH_FFMPEG || 'ffmpeg', [
      '-nostdin', '-loglevel', 'error', '-n', '-f', 'image2pipe', '-framerate', String(FPS),
      '-vcodec', 'png', '-i', 'pipe:0', '-an', '-c:v', codec, '-pix_fmt', 'yuv420p',
      '-threads', '2', '-fs', String(MAX_BYTES), result,
    ], { stdio: ['pipe', 'ignore', 'inherit'], signal: controller.signal });
    encoder.stdin.on('error', () => {});
    encoded = once(encoder, 'close').then(([code]) => {
      if (code !== 0) throw Error('KOR_ENCODER_FAILED');
    });
    encoded.catch(() => {});
    frameCount = Math.ceil(bundle.durationMs * FPS / 1000);
    for (let i = 0; i < frameCount; i++) {
      const frame = await capture(i === frameCount - 1 ? bundle.durationMs : i * 1000 / FPS);
      await Promise.race([
        new Promise((accept, reject) => encoder.stdin.write(frame, error => error ? reject(error) : accept())),
        encoded.then(() => { throw Error('KOR_ENCODER_STOPPED'); }),
      ]);
    }
    encoder.stdin.end();
    await encoded;
  }
  controller.signal.throwIfAborted();
  if ((await stat(result)).size >= MAX_BYTES) throw Error('KOR_EXPORT_BUDGET');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(result)) hash.update(chunk);
  const receipt = {
    format: 'koreograph.raster-receipt/0.1', bundleDigest,
    ...(prior ? { upstreamReceiptDigest: await digest(canonical(prior)) } : {}),
    output: { format: mode, digest: 'sha256:' + hash.digest('hex'), width, height, frameCount,
      ...(mode === 'png' ? { timeMs: time } : { fps: FPS, captureDurationMs: frameCount * 1000 / FPS }) },
    rasterEnvironment: { chromium: browserVersion, platform: process.platform, arch: process.arch, fontFamily: 'sans-serif' },
  };
  await writeFile(sidecar, JSON.stringify(receipt, null, 2), { flag: 'wx', mode: 0o600 });
  // Publish both local files without replacing an existing name, and roll back partial output.
  await link(result, target);
  outputLinked = true;
  await link(sidecar, target + '.receipt.json');
  receiptLinked = true;
  console.log(target);
} catch (error) {
  if (outputLinked && !receiptLinked) await rm(target, { force: true });
  console.error(controller.signal.aborted ? 'KOR_CANCELLED' : error.message);
  process.exitCode = 1;
} finally {
  clearTimeout(deadline);
  if (encoder && encoder.exitCode === null) { encoder.kill('SIGKILL'); await encoded?.catch(() => {}); }
  await browser?.close().catch(() => {});
  await rm(scratch, { recursive: true, force: true });
}
