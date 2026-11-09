// @ts-check
// Reads, checks and updates the repo settings file (src/data/repos.yaml) and its local,
// git-ignored twin for private repos (src/data/repos.private.yaml). Works on the YAML document
// itself, so the owner's comments and layout survive every update. Node only.
import { parseDocument, LineCounter, isMap, isSeq, isScalar, YAMLMap } from 'yaml';
import { autoFor, guessCategory } from './catalog.mjs';

/** @typedef {import('./catalog.mjs').Repo} Repo @typedef {import('./catalog.mjs').Settings} Settings */
/** @typedef {import('yaml').Document.Parsed} Doc */

const CATEGORY_KEYS = ['title', 'intro', 'topics', 'names', 'chip', 'more', 'default'];
const ENTRY_KEYS = ['id', 'repo', 'show', 'category', 'name', 'label', 'auto'];
const AUTO_KEYS = ['category', 'show', 'private', 'fork', 'archived', 'gone', 'description', 'topics'];
const YAML_OUT = { lineWidth: 0 };

/**
 * @param {string} text @param {string} file the path shown in error messages
 * @param {{ categories?: Record<string, unknown>, isPrivate?: boolean }} [opts] categories from the
 *   main file, for checking the private file, which has none of its own
 */
export function load(text, file, opts = {}) {
  const lc = new LineCounter();
  const doc = parseDocument(text, { lineCounter: lc, keepSourceTokens: false });
  /** @type {string[]} */
  const errors = doc.errors.map((e) => `${file}:${e.linePos?.[0].line ?? 1}: ${e.message.split('\n')[0]}`);
  if (errors.length) return { doc, lc, data: /** @type {Settings} */ ({ categories: {}, repos: [] }), errors };
  const data = /** @type {Settings} */ (doc.toJS() ?? {});
  errors.push(...validate(doc, lc, file, opts));
  return { doc, lc, data, errors };
}

/**
 * Every problem in the file, each naming the file and line. An unknown key, an unknown category
 * or a value of the wrong type fails the build rather than being guessed at.
 * @param {Doc} doc @param {LineCounter} lc @param {string} file
 * @param {{ categories?: Record<string, unknown>, isPrivate?: boolean }} opts
 */
export function validate(doc, lc, file, { categories, isPrivate = false } = {}) {
  /** @type {string[]} */
  const out = [];
  /** @param {any} node @param {string} msg */
  const at = (node, msg) => out.push(`${file}:${node?.range ? lc.linePos(node.range[0]).line : 1}: ${msg}`);
  const root = doc.contents;
  if (!isMap(root)) return [`${file}:1: expected "categories:" and "repos:" at the top level`];
  for (const pair of root.items) {
    const k = String(/** @type {any} */ (pair.key)?.value);
    if (!(isPrivate ? ['repos'] : ['categories', 'repos']).includes(k)) at(pair.key, `unknown top-level key "${k}"`);
  }

  let cats = categories;
  if (!isPrivate) {
    const node = root.get('categories', true);
    if (!isMap(node)) {
      at(root, 'missing "categories:"');
      return out;
    }
    cats = /** @type {Record<string, unknown>} */ (node.toJSON());
    let defaults = 0;
    for (const pair of node.items) {
      const id = String(/** @type {any} */ (pair.key)?.value);
      if (!/^[a-z][a-z0-9-]*$/.test(id)) at(pair.key, `category id "${id}" should be lowercase letters, digits and hyphens`);
      const c = pair.value;
      if (!isMap(c)) {
        at(pair.key, `category "${id}" needs title and intro`);
        continue;
      }
      for (const p of c.items) {
        const k = String(/** @type {any} */ (p.key)?.value);
        if (!CATEGORY_KEYS.includes(k)) at(p.key, `unknown key "${k}" in category "${id}". Allowed: ${CATEGORY_KEYS.join(', ')}`);
      }
      for (const k of ['title', 'intro']) if (typeof c.get(k) !== 'string') at(c.get(k, true) ?? pair.key, `category "${id}" needs ${k} as text`);
      const topics = c.get('topics', true);
      if (topics !== undefined && !(isSeq(topics) && topics.items.every((t) => isScalar(t) && typeof t.value === 'string')))
        at(topics, `category "${id}": topics should be a list of words, like [macos]`);
      const names = c.get('names', true);
      if (names !== undefined) {
        try {
          new RegExp(String(/** @type {any} */ (names).value));
        } catch {
          at(names, `category "${id}": names isn't a valid pattern`);
        }
      }
      const def = c.get('default');
      if (def !== undefined && typeof def !== 'boolean') at(c.get('default', true), `category "${id}": default should be true or false`);
      if (def === true) defaults++;
    }
    if (defaults !== 1) at(node, `exactly one category needs "default: true" (found ${defaults}); repos that match no topic go there`);
  }
  const known = Object.keys(cats ?? {});

  const repos = root.get('repos', true);
  if (repos === undefined || (isScalar(repos) && repos.value === null)) return out;
  if (!isSeq(repos)) {
    at(repos, '"repos:" should be a list');
    return out;
  }
  const seen = new Map();
  for (const item of repos.items) {
    if (!isMap(item)) {
      at(item, 'each repo should be an entry with id and repo');
      continue;
    }
    for (const p of item.items) {
      const k = String(/** @type {any} */ (p.key)?.value);
      if (!ENTRY_KEYS.includes(k)) at(p.key, `unknown key "${k}". Allowed: ${ENTRY_KEYS.join(', ')}`);
    }
    const id = item.get('id');
    const name = item.get('repo');
    if (!Number.isInteger(id)) at(item.get('id', true) ?? item, 'each repo needs its numeric GitHub id');
    else if (seen.has(id)) at(item.get('id', true), `id ${id} is listed twice (also ${seen.get(id)})`);
    else seen.set(id, name);
    if (typeof name !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(name)) at(item.get('repo', true) ?? item, 'repo should be Owner/name');
    const show = item.get('show');
    if (show !== undefined && typeof show !== 'boolean') at(item.get('show', true), `show should be true or false, not "${show}"`);
    for (const k of ['category']) {
      const v = item.get(k);
      if (v !== undefined && !known.includes(String(v))) at(item.get(k, true), `unknown category "${v}" for ${name}. Choose one of: ${known.join(', ')}`);
    }
    for (const k of ['name', 'label']) {
      const v = item.get(k);
      if (v !== undefined && (typeof v !== 'string' || !v.trim())) at(item.get(k, true), `${k} should be text`);
    }
    const auto = item.get('auto', true);
    if (auto !== undefined) {
      if (!isMap(auto)) at(auto, 'auto should be a map; the build writes it');
      else
        for (const p of auto.items) {
          const k = String(/** @type {any} */ (p.key)?.value);
          if (!AUTO_KEYS.includes(k)) at(p.key, `unknown key "${k}" under auto`);
        }
    }
    // The public file is in a public repo: a private repo may only be named there once it's shown.
    if (!isPrivate && isMap(auto) && auto.get('private') === true && show !== true)
      at(item, `${name} is private and not shown, so it belongs in repos.private.yaml (git-ignored), not here`);
  }
  return out;
}

/** @param {Doc} doc @returns {import('yaml').YAMLSeq} */
function reposSeq(doc) {
  let seq = doc.get('repos', true);
  if (!isSeq(seq)) {
    doc.set('repos', doc.createNode([]));
    seq = doc.get('repos', true);
  }
  /** @type {any} */ (seq).flow = false;
  return /** @type {any} */ (seq);
}

/** @param {Doc} doc @param {Record<string, unknown>} auto */
function autoNode(doc, auto) {
  const clean = Object.fromEntries(AUTO_KEYS.filter((k) => auto[k] !== undefined).map((k) => [k, auto[k]]));
  const node = doc.createNode(clean);
  if (clean.description === undefined) node.flow = true;
  return node;
}

/** Sets auto on an entry only when it changed, so an unchanged file stays byte-for-byte the same. @param {Doc} doc @param {YAMLMap} item @param {Record<string, unknown>} auto */
function setAuto(doc, item, auto) {
  const old = item.get('auto', true);
  const now = autoNode(doc, auto);
  if (old && JSON.stringify(/** @type {any} */ (old).toJSON()) === JSON.stringify(now.toJSON())) return false;
  item.set('auto', now);
  return true;
}

/** Inserts an entry in name order. @param {Doc} doc @param {Record<string, unknown>} entry */
function insertSorted(doc, entry) {
  const seq = reposSeq(doc);
  const node = /** @type {YAMLMap} */ (doc.createNode(entry));
  node.set('auto', autoNode(doc, /** @type {any} */ (entry.auto)));
  const key = String(entry.repo).toLowerCase();
  const i = seq.items.findIndex((it) => isMap(it) && String(it.get('repo')).toLowerCase() > key);
  node.spaceBefore = true;
  node.flow = false;
  seq.items.splice(i === -1 ? seq.items.length : i, 0, node);
  seq.items.forEach((it, n) => {
    if (isMap(it)) it.spaceBefore = n > 0;
  });
}

/** @param {Doc} doc */
const entries = (doc) => /** @type {YAMLMap[]} */ (reposSeq(doc).items.filter(isMap));

/**
 * Brings the public file up to date with GitHub's public listing. New repos are added with
 * guessed values under `auto`; renamed repos are matched by id and keep the owner's values;
 * repos that leave the listing are marked `gone` with the date, never dropped. Values outside
 * `auto` are the owner's and are never touched, except `repo`, which follows renames.
 * @param {Doc} doc @param {Repo[]} listing @param {string} today YYYY-MM-DD
 * @returns {string[]} what changed, one line each
 */
export function syncPublic(doc, listing, today) {
  if (listing.some((r) => r.private)) throw new Error('syncPublic was given a private repo; refusing to write it to the public file.');
  const categories = /** @type {any} */ (doc.toJS()).categories;
  /** @type {string[]} */
  const changes = [];
  const byId = new Map(entries(doc).map((it) => [it.get('id'), it]));
  for (const repo of listing) {
    const item = byId.get(repo.id);
    const auto = autoFor(repo, categories);
    if (!item) {
      insertSorted(doc, { id: repo.id, repo: repo.full_name, auto });
      changes.push(`added ${repo.full_name} (${auto.category}${auto.show ? '' : ', hidden'})`);
      continue;
    }
    if (item.get('repo') !== repo.full_name) {
      changes.push(`renamed ${item.get('repo')} to ${repo.full_name}`);
      item.set('repo', repo.full_name);
    }
    if (setAuto(doc, item, auto)) changes.push(`updated ${repo.full_name}`);
  }
  const live = new Set(listing.map((r) => r.id));
  for (const item of entries(doc)) {
    const auto = /** @type {any} */ (item.get('auto', true))?.toJSON() ?? {};
    if (live.has(item.get('id')) || auto.private || auto.gone) continue;
    setAuto(doc, item, { category: auto.category, show: false, gone: today });
    changes.push(`marked ${item.get('repo')} as gone from GitHub's public list`);
  }
  return changes;
}

/**
 * Brings the local private file up to date with the private repos, then copies the ones the
 * owner shows into the public file (with the description and topics the build can't fetch), and
 * removes from the public file any private repo that's no longer shown.
 * @param {Doc} pub the public file @param {Doc} local the private file @param {Repo[]} privateRepos
 * @param {string} today
 */
export function syncPrivate(pub, local, privateRepos, today) {
  const categories = /** @type {any} */ (pub.toJS()).categories;
  /** @type {string[]} */
  const changes = [];
  const byId = new Map(entries(local).map((it) => [it.get('id'), it]));
  for (const repo of privateRepos.filter((r) => r.private)) {
    const auto = {
      category: guessCategory(repo, categories).id,
      show: false,
      private: true,
      description: repo.description,
      topics: repo.topics ?? [],
    };
    const item = byId.get(repo.id);
    if (!item) {
      insertSorted(local, { id: repo.id, repo: repo.full_name, auto });
      changes.push(`added private ${repo.full_name} to repos.private.yaml (hidden)`);
      continue;
    }
    if (item.get('repo') !== repo.full_name) item.set('repo', repo.full_name);
    setAuto(local, item, auto);
  }
  const stillPrivate = new Set(privateRepos.filter((r) => r.private).map((r) => r.id));
  for (const item of entries(local)) {
    const auto = /** @type {any} */ (item.get('auto', true))?.toJSON() ?? {};
    if (!stillPrivate.has(item.get('id')) && !auto.gone) {
      setAuto(local, item, { ...auto, show: false, gone: today });
      changes.push(`marked ${item.get('repo')} in repos.private.yaml as no longer private (public, deleted or moved)`);
    }
  }

  // Copy shown private repos into the public file; take hidden ones out.
  const pubById = new Map(entries(pub).map((it) => [it.get('id'), it]));
  const shown = new Set();
  for (const item of entries(local)) {
    const auto = /** @type {any} */ (item.get('auto', true))?.toJSON() ?? {};
    if (auto.gone || item.get('show') !== true) continue;
    shown.add(item.get('id'));
    const mine = Object.fromEntries(['show', 'category', 'name', 'label'].filter((k) => item.has(k)).map((k) => [k, item.get(k)]));
    const target = pubById.get(item.get('id'));
    if (!target) {
      insertSorted(pub, { id: item.get('id'), repo: item.get('repo'), ...mine, auto });
      changes.push(`showing private ${item.get('repo')} on the site (no link)`);
      continue;
    }
    target.set('repo', item.get('repo'));
    for (const k of ['category', 'name', 'label']) if (k in mine) target.set(k, mine[k]);
    else target.delete(k);
    target.set('show', true);
    setAuto(pub, target, auto);
  }
  const seq = reposSeq(pub);
  seq.items = seq.items.filter((it) => {
    if (!isMap(it)) return true;
    const auto = /** @type {any} */ (it.get('auto', true))?.toJSON() ?? {};
    if (!auto.private || shown.has(it.get('id'))) return true;
    changes.push(`removed private ${it.get('repo')} from repos.yaml (not shown)`);
    return false;
  });
  return changes;
}

/** @param {Doc} doc */
export const dump = (doc) => doc.toString(YAML_OUT);
