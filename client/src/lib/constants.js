export const PRIORITIES = ["Critical", "High", "Medium", "Low"];
export const STATUSES = ["New", "In Progress", "Testing", "Resolved", "Closed"];
export const ROLES = ["admin", "developer", "tester", "reporter"];

/*
 * Badge styling. Each hue is a theme token (see the palette block in index.css),
 * so both themes are handled by one string here — nothing needs a `dark:` variant.
 */
export const PRIORITY_STYLES = {
  Critical: "bg-p-critical-soft text-p-critical-fg ring-p-critical-line",
  High: "bg-p-high-soft text-p-high-fg ring-p-high-line",
  Medium: "bg-p-medium-soft text-p-medium-fg ring-p-medium-line",
  Low: "bg-p-low-soft text-p-low-fg ring-p-low-line",
};

export const STATUS_STYLES = {
  New: "bg-s-new-soft text-s-new-fg ring-s-new-line",
  "In Progress": "bg-s-progress-soft text-s-progress-fg ring-s-progress-line",
  Testing: "bg-s-testing-soft text-s-testing-fg ring-s-testing-line",
  Resolved: "bg-s-resolved-soft text-s-resolved-fg ring-s-resolved-line",
  Closed: "bg-s-closed-soft text-s-closed-fg ring-s-closed-line",
};

/*
 * Chart fills. These land in inline `style` / SVG attributes, so they are var()
 * references rather than literals — the charts then re-colour on theme flip
 * without React re-rendering.
 */
export const PRIORITY_BARS = {
  Critical: "var(--p-critical)",
  High: "var(--p-high)",
  Medium: "var(--p-medium)",
  Low: "var(--p-low)",
};

export const STATUS_BARS = {
  New: "var(--s-new)",
  "In Progress": "var(--s-progress)",
  Testing: "var(--s-testing)",
  Resolved: "var(--s-resolved)",
  Closed: "var(--s-closed)",
};
