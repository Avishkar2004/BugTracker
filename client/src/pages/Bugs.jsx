import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../api/client.js";
import { Alert, Avatar, EmptyState, PriorityBadge, Spinner, StatusBadge, Tag } from "../components/ui.jsx";
import { PRIORITIES, STATUSES } from "../lib/constants.js";
import { timeAgo } from "../lib/format.js";

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "updated", label: "Recently updated" },
  { value: "priority", label: "Highest priority" },
  { value: "title", label: "Title A–Z" },
];

const EMPTY_FILTERS = {
  q: "",
  status: "",
  priority: "",
  assignee: "",
  tags: "",
  open: "",
  sort: "newest",
  page: "1",
};

export default function Bugs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const filters = useMemo(() => {
    const current = { ...EMPTY_FILTERS };
    for (const key of Object.keys(EMPTY_FILTERS)) {
      const value = searchParams.get(key);
      if (value !== null) current[key] = value;
    }
    return current;
  }, [searchParams]);

  const [search, setSearch] = useState(filters.q);
  useEffect(() => setSearch(filters.q), [filters.q]);

  const updateFilter = useCallback(
    (patch) => {
      const next = { ...filters, ...patch };
      if (!("page" in patch)) next.page = "1";
      const params = Object.fromEntries(
        Object.entries(next).filter(([key, value]) => value && value !== EMPTY_FILTERS[key])
      );
      setSearchParams(params, { replace: true });
    },
    [filters, setSearchParams]
  );

  const load = useCallback(() => {
    setError("");
    return api
      .get("/bugs", { params: { ...filters, limit: 20 } })
      .then(({ data: payload }) => {
        setData(payload);
        setSelected(new Set());
      })
      .catch((err) => setError(errorMessage(err, "Could not load bugs")));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get("/users").then(({ data: payload }) => setUsers(payload.users)).catch(() => {});
  }, []);

  // Debounce the free-text search so typing does not fire a request per keystroke.
  useEffect(() => {
    if (search === filters.q) return undefined;
    const timer = setTimeout(() => updateFilter({ q: search }), 350);
    return () => clearTimeout(timer);
  }, [search, filters.q, updateFilter]);

  const toggleOne = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) =>
      prev.size === data.bugs.length ? new Set() : new Set(data.bugs.map((b) => b._id))
    );

  const applyBulk = async (patch) => {
    if (!selected.size) return;
    setBusy(true);
    setNotice("");
    try {
      const { data: result } = await api.patch("/bugs/bulk", { ids: [...selected], ...patch });
      setNotice(result.message);
      await load();
    } catch (err) {
      setError(errorMessage(err, "Bulk update failed"));
    } finally {
      setBusy(false);
    }
  };

  const download = async (format) => {
    try {
      const response = await api.get("/bugs/export", {
        params: { ...filters, format },
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bugs-${new Date().toISOString().slice(0, 10)}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(errorMessage(err, "Export failed"));
    }
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => !["sort", "page"].includes(key) && value
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bugs</h1>
          <p className="text-sm text-ink-500">
            {data ? `${data.pagination.total} matching ${data.pagination.total === 1 ? "bug" : "bugs"}` : "Loading…"}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => download("csv")} className="btn-ghost">
            Export CSV
          </button>
          <button type="button" onClick={() => download("json")} className="btn-ghost">
            Export JSON
          </button>
          <Link to="/bugs/new" className="btn-primary">
            Report a bug
          </Link>
        </div>
      </header>

      <Alert>{error}</Alert>
      {notice && <Alert tone="success">{notice}</Alert>}

      <section className="card p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <label className="label" htmlFor="search">
              Search
            </label>
            <input
              id="search"
              className="field"
              placeholder="Title, description, key or tag"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <label className="label" htmlFor="status">
              Status
            </label>
            <select
              id="status"
              className="field"
              value={filters.status}
              onChange={(e) => updateFilter({ status: e.target.value, open: "" })}
            >
              <option value="">Any status</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="priority">
              Priority
            </label>
            <select
              id="priority"
              className="field"
              value={filters.priority}
              onChange={(e) => updateFilter({ priority: e.target.value })}
            >
              <option value="">Any priority</option>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="assignee">
              Assignee
            </label>
            <select
              id="assignee"
              className="field"
              value={filters.assignee}
              onChange={(e) => updateFilter({ assignee: e.target.value })}
            >
              <option value="">Anyone</option>
              <option value="me">Me</option>
              <option value="unassigned">Unassigned</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="sort">
              Sort
            </label>
            <select
              id="sort"
              className="field"
              value={filters.sort}
              onChange={(e) => updateFilter({ sort: e.target.value })}
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-ink-300"
              checked={filters.open === "true"}
              onChange={(e) => updateFilter({ open: e.target.checked ? "true" : "", status: "" })}
            />
            Open bugs only
          </label>

          {filters.tags && (
            <span className="flex items-center gap-1.5">
              {filters.tags.split(",").filter(Boolean).map((tag) => (
                <Tag
                  key={tag}
                  value={tag}
                  onRemove={() =>
                    updateFilter({
                      tags: filters.tags.split(",").filter((t) => t !== tag).join(","),
                    })
                  }
                />
              ))}
            </span>
          )}

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => setSearchParams({}, { replace: true })}
              className="ml-auto text-sm font-medium text-indigo-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </section>

      {selected.size > 0 && (
        <section className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 shadow-sm">
          <span className="text-sm font-medium text-indigo-900">{selected.size} selected</span>

          <select
            className="field w-auto"
            value=""
            disabled={busy}
            onChange={(e) => e.target.value && applyBulk({ status: e.target.value })}
          >
            <option value="">Set status…</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          <select
            className="field w-auto"
            value=""
            disabled={busy}
            onChange={(e) => e.target.value && applyBulk({ priority: e.target.value })}
          >
            <option value="">Set priority…</option>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>

          <select
            className="field w-auto"
            value=""
            disabled={busy}
            onChange={(e) => e.target.value && applyBulk({ assignee: e.target.value === "none" ? "" : e.target.value })}
          >
            <option value="">Assign to…</option>
            <option value="none">Unassigned</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>

          <button type="button" onClick={() => setSelected(new Set())} className="btn-ghost ml-auto">
            Clear selection
          </button>
        </section>
      )}

      <section className="card overflow-hidden">
        {!data ? (
          <Spinner />
        ) : data.bugs.length === 0 ? (
          <EmptyState
            title="No bugs match these filters"
            hint="Try widening the search, or report the bug you were looking for."
            action={
              <Link to="/bugs/new" className="btn-primary mt-2">
                Report a bug
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select all bugs on this page"
                      className="h-4 w-4 rounded border-ink-300"
                      checked={selected.size === data.bugs.length && data.bugs.length > 0}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-3 py-2.5">Bug</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">Priority</th>
                  <th className="px-3 py-2.5">Assignee</th>
                  <th className="px-3 py-2.5">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.bugs.map((bug) => (
                  <tr key={bug._id} className="hover:bg-ink-50">
                    <td className="px-3 py-3 align-top">
                      <input
                        type="checkbox"
                        aria-label={`Select ${bug.key}`}
                        className="h-4 w-4 rounded border-ink-300"
                        checked={selected.has(bug._id)}
                        onChange={() => toggleOne(bug._id)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Link to={`/bugs/${bug._id}`} className="font-medium text-ink-900 hover:text-indigo-600">
                        <span className="mr-2 font-mono text-xs text-ink-500">{bug.key}</span>
                        {bug.title}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        {bug.tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => updateFilter({ tags: tag })}
                            className="rounded-md bg-ink-100 px-1.5 py-0.5 text-xs text-ink-600 hover:bg-indigo-100 hover:text-indigo-700"
                          >
                            #{tag}
                          </button>
                        ))}
                        {bug.commentCount > 0 && (
                          <span className="text-xs text-ink-500">💬 {bug.commentCount}</span>
                        )}
                        {bug.attachments?.length > 0 && (
                          <span className="text-xs text-ink-500">📎 {bug.attachments.length}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <StatusBadge value={bug.status} />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <PriorityBadge value={bug.priority} />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className="flex items-center gap-2">
                        <Avatar user={bug.assignee} size={24} />
                        <span className="text-ink-700">{bug.assignee?.name || "Unassigned"}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 align-top text-ink-500">
                      {timeAgo(bug.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {data && data.pagination.pages > 1 && (
        <nav className="flex items-center justify-between text-sm">
          <button
            type="button"
            className="btn-ghost"
            disabled={data.pagination.page <= 1}
            onClick={() => updateFilter({ page: String(data.pagination.page - 1) })}
          >
            Previous
          </button>
          <span className="text-ink-500">
            Page {data.pagination.page} of {data.pagination.pages}
          </span>
          <button
            type="button"
            className="btn-ghost"
            disabled={data.pagination.page >= data.pagination.pages}
            onClick={() => updateFilter({ page: String(data.pagination.page + 1) })}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}
