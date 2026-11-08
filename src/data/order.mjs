// The one rule for ordering projects within a section, shared by the page and by
// scripts/check-order.mjs: alphabetical by displayed name, ignoring case and a leading "The".

/** @param {string} name */
export function sortKey(name) {
  return name.trim().replace(/^the\s+/i, '');
}

/** @param {string} a @param {string} b */
export function compareNames(a, b) {
  return (
    sortKey(a).localeCompare(sortKey(b), 'en', { sensitivity: 'base', numeric: true }) ||
    // Equal apart from case or "The": fall back to the full name so the order never depends on the API.
    a.localeCompare(b, 'en')
  );
}
