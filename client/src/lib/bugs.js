import { PRIORITIES } from "./constants.js";

/*
 * Client-side mirrors of two rules the server also enforces. Neither is a
 * security boundary — the API re-checks both — they exist so the UI can hide an
 * affordance the reader is not allowed to use, and so an optimistic move can
 * land a card in the same place the next fetch would have put it.
 */

const id = (value) => String(value?._id ?? value ?? "");

/** Same test as `canEdit` in server/src/controllers/bug.controller.js. */
export function canEditBug(user, bug) {
  if (!user || !bug) return false;
  if (["admin", "developer"].includes(user.role)) return true;
  return id(bug.reporter) === id(user._id) || id(bug.assignee) === id(user._id);
}

const byDate = (field, direction) => (a, b) =>
  direction * (new Date(a[field]).getTime() - new Date(b[field]).getTime());

/* Mirrors the SORTABLE map in the bug controller. A moved card is re-inserted
   with this rather than appended, so it does not jump on the next reload. */
const COMPARATORS = {
  newest: byDate("createdAt", -1),
  oldest: byDate("createdAt", 1),
  updated: byDate("updatedAt", -1),
  title: (a, b) => a.title.localeCompare(b.title),
  priority: (a, b) =>
    PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) ||
    byDate("createdAt", -1)(a, b),
};

export function compareBugs(sort) {
  return COMPARATORS[sort] || COMPARATORS.newest;
}

/** Returns a new list with `bug` placed where the given sort would put it. */
export function insertSorted(list, bug, sort) {
  const compare = compareBugs(sort);
  const next = [...list];
  const at = next.findIndex((item) => compare(bug, item) < 0);
  next.splice(at === -1 ? next.length : at, 0, bug);
  return next;
}
