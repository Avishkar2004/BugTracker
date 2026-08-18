import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

/*
 * Bug filters live in the query string rather than in component state, so any
 * view can be bookmarked, shared, or reloaded without losing its shape.
 *
 * Each view passes its own `defaults` object — it must be module-level, because
 * its identity is what memoises the parsed result. A value equal to its default
 * is stripped from the URL, so "no query string" always means "the plain view".
 */

/* Filters that mean the same thing in every view, and so survive a view switch.
   `status`, `open` and `page` are deliberately absent: the board draws one
   column per status and never paginates, so carrying them across would empty
   columns for reasons the reader cannot see. */
const SHARED_KEYS = ["q", "priority", "assignee", "tags", "sort"];

export function useBugFilters(defaults) {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(() => {
    const current = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const value = searchParams.get(key);
      if (value !== null) current[key] = value;
    }
    return current;
  }, [searchParams, defaults]);

  const updateFilter = useCallback(
    (patch) => {
      const next = { ...filters, ...patch };
      // Narrowing the result set invalidates the current page number.
      if ("page" in defaults && !("page" in patch)) next.page = "1";
      const params = Object.fromEntries(
        Object.entries(next).filter(([key, value]) => value && value !== defaults[key])
      );
      setSearchParams(params, { replace: true });
    },
    [filters, defaults, setSearchParams]
  );

  const clearFilters = useCallback(() => setSearchParams({}, { replace: true }), [setSearchParams]);

  /* Query string to hand the other view. Built from the raw params rather than
     from `filters` so a value only travels if the reader actually chose it —
     the two views default `sort` differently, and an inherited default would
     look like a choice the reader never made. */
  const sharedSearch = useMemo(() => {
    const next = new URLSearchParams();
    for (const key of SHARED_KEYS) {
      const value = searchParams.get(key);
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return query ? `?${query}` : "";
  }, [searchParams]);

  /* Filters worth counting on a "clear filters" affordance — ordering and
     paging are not filters, and clearing them would surprise. */
  const activeFilterCount = useMemo(
    () =>
      Object.entries(filters).filter(
        ([key, value]) => !["sort", "page"].includes(key) && value && value !== defaults[key]
      ).length,
    [filters, defaults]
  );

  return { filters, updateFilter, clearFilters, sharedSearch, activeFilterCount, setSearchParams };
}
