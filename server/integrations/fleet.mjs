// KNAV experimental, opt-in consumer of an explicitly supplied Manager inventory export.
// This is NOT a ratified inter-project contract and does not scan canonical workspaces.
import fs from 'node:fs';
import path from 'node:path';
import { fail } from '../errors.mjs';

export const FLEET_PREVIEW_FORMAT = 'konstellation.manager-inventory-preview/0.1';
const ID = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$/;
const SHA = /^sha256:[0-9a-f]{64}$/;
const READY = new Set(['unknown', 'not_checked', 'not_ready', 'ready', 'blocked', 'unavailable']);
const AVAILABILITY = new Set(['unknown', 'available', 'unavailable']);
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const validText = (value, max = 200) => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\x00-\x1f\x7f]/.test(value);
const listOf = (value) => Array.isArray(value) && value.length <= 32 && value.every((item) => validText(item, 128));
const isObject = (value) => value && typeof value === 'object' && !Array.isArray(value);

export function validateFleetExport(doc) {
  if (!isObject(doc) || doc.format !== FLEET_PREVIEW_FORMAT || !Array.isArray(doc.entries) || doc.entries.length > 1000)
    fail('FLEET_EXPORT_INVALID', 'Unsupported or oversized Manager preview export.', 422);
  const seen = new Set();
  return doc.entries.map((entry) => {
    if (!isObject(entry) || !ID.test(entry.id || '') || !validText(entry.title) ||
        !['private', 'public'].includes(entry.visibility) ||
        !READY.has(entry.readiness) || !AVAILABILITY.has(entry.availability) ||
        !listOf(entry.allowed_principals) || !listOf(entry.allowed_roles) ||
        (entry.state_ref !== undefined && !validText(entry.state_ref, 512)) ||
        (entry.state_commitment !== undefined && !SHA.test(entry.state_commitment)) ||
        (entry.archetype !== undefined && !validText(entry.archetype, 100)) ||
        seen.has(entry.id)) fail('FLEET_EXPORT_INVALID', 'Invalid or duplicate Manager preview entry.', 422);
    // Reject fields that could contain filesystem paths, tokens, source payloads,
    // or implicitly claim verification, authority or publication.
    const fields = new Set(['id', 'title', 'visibility', 'readiness', 'availability',
      'allowed_principals', 'allowed_roles', 'state_ref', 'state_commitment', 'archetype']);
    if (Object.keys(entry).some((key) => !fields.has(key)))
      fail('FLEET_EXPORT_INVALID', 'Unexpected Manager preview entry field.', 422);
    seen.add(entry.id);
    return entry;
  });
}

export function readFleetExport(file) {
  if (!file) return [];
  // The administrator explicitly supplies this one local file. No recursive
  // scanning, no symlinks, no workspaces and no inferred Manager API.
  const absolute = path.resolve(file);
  let stat;
  try { stat = fs.lstatSync(absolute); }
  catch { fail('FLEET_EXPORT_UNAVAILABLE', 'Configured inventory export is unavailable.', 503); }
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024)
    fail('FLEET_EXPORT_INVALID', 'Inventory export must be a regular file below 1 MiB.', 422);
  let doc;
  try { doc = JSON.parse(fs.readFileSync(absolute, 'utf8')); }
  catch { fail('FLEET_EXPORT_INVALID', 'Inventory export is not valid JSON.', 422); }
  if (Object.keys(doc || {}).some((key) => !['format', 'entries'].includes(key)))
    fail('FLEET_EXPORT_INVALID', 'Unexpected inventory export field.', 422);
  return validateFleetExport(doc);
}

export function fleetForPrincipal(principal, entries, collection = null) {
  if (!principal?.scopes?.includes('read') && !principal?.scopes?.includes('admin'))
    fail('ACCESS_DENIED', 'Read scope required.', 403);
  const local = entries
    .filter((entry) => entry.allowed_principals.includes(principal.id) ||
      entry.allowed_roles.some((role) => principal.roles.includes(role)))
    .map((entry) => ({
      key: `local:${entry.id}`, source: 'local_manager_preview', id: entry.id,
      title: entry.title, availability: entry.availability, readiness: entry.readiness,
      verification: 'declared_only', viewKind: 'inventory_only', openable: false,
      ...(entry.state_ref ? { stateRef: entry.state_ref } : {}),
      ...(entry.state_commitment ? { stateCommitment: entry.state_commitment } : {}),
      ...(entry.archetype ? { archetype: entry.archetype } : {}),
    }));
  const hosted = (collection?.items || []).map((item) => ({
    key: `reader:${item.id}`, source: collection?.source === 'kristal-github-collection-v10'
      ? 'github_v10_checkout' : 'legacy_reader',
    id: item.id, title: item.label, availability: item.available ? 'available' : 'unavailable',
    readiness: 'unknown', verification: collection?.source === 'kristal-github-collection-v10'
      ? 'index_only' : 'not_checked',
    viewKind: collection?.source === 'kristal-github-collection-v10' ? 'technical_hosting' : 'legacy',
    openable: Boolean(item.available),
    ...(item.available ? { readerId: item.id } : {}),
    ...(item.stateRef ? { stateRef: item.stateRef } : {}),
    ...(item.stateCommitment ? { stateCommitment: item.stateCommitment } : {}),
  }));
  // No joining on title, slug or state_ref: local and hosted observations remain separate.
  return { format: 'konstellation.fleet-view/0.1', experimental: true,
    items: [...local, ...hosted].sort((a, b) => a.title.localeCompare(b.title, 'en') || a.key.localeCompare(b.key)) };
}
