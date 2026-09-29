import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
addFormats(ajv);
export class AppError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export function fail(code, message, status = 400) {
  throw new AppError(code, message, status);
}
const validators = new Map();
for (const name of ['query-spec', 'lens', 'relation-registry', 'exploration-state', 'result-set', 'constellation-response']) {
  validators.set(
    name,
    ajv.compile(
      JSON.parse(fs.readFileSync(path.join(ROOT, 'contracts', `${name}.schema.json`), 'utf8')),
    ),
  );
}
export function validate(name, value) {
  const fn = validators.get(name);
  if (!fn(value))
    fail(
      'INVALID_QUERY',
      `${name}: ${fn.errors
        .slice(0, 3)
        .map((e) => `${e.instancePath || '/'} ${e.message}`)
        .join('; ')}`,
    );
  return value;
}
export { ajv };
