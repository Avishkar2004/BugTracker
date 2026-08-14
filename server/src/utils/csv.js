function escapeCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Guard against spreadsheet formula injection on export.
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {Array<{ key: string, label: string }>} columns
 */
export function toCsv(rows, columns) {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(","));
  return [header, ...body].join("\r\n");
}
