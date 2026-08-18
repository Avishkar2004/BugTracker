import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, MessageSquare, Paperclip } from "lucide-react";
import api, { errorMessage } from "../api/client.js";
import { Alert, Avatar, PriorityBadge, StatusBadge, Tag, ViewSwitch } from "../components/ui.jsx";
import { BoardSkeleton } from "../components/skeletons.jsx";
import { useToast } from "../components/toast.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { PRIORITIES, STATUSES } from "../lib/constants.js";
import { canEditBug, insertSorted } from "../lib/bugs.js";
import { timeAgo } from "../lib/format.js";
import { useBugFilters } from "../lib/useBugFilters.js";

/*
 * Kanban view of the same bugs the table shows, one column per status.
 *
 * `status` and `open` are not filters here — the columns *are* the status — so
 * the board keeps its own defaults and lets useBugFilters carry across only the
 * filters that mean the same thing in both views. Cards are ordered by priority
 * by default, which is the order a standup reads them in.
 */
const BOARD_DEFAULTS = { q: "", priority: "", assignee: "", tags: "", sort: "priority" };

/* Per column, not per board. A column deeper than this is a backlog to triage
   in the table view, not something to drag one card at a time. */
const COLUMN_LIMIT = 50;

const SORTS = [
  { value: "priority", label: "Priority" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "updated", label: "Recently updated" },
  { value: "title", label: "Title A–Z" },
];

/** Moves one card between two columns, keeping both counts and the sort honest. */
function transfer(columns, bug, from, to, sort) {
  if (!columns?.[from] || !columns?.[to]) return columns;
  return {
    ...columns,
    [from]: {
      bugs: columns[from].bugs.filter((b) => b._id !== bug._id),
      total: Math.max(0, columns[from].total - 1),
    },
    [to]: {
      // Filtering the target as well makes a repeated drop idempotent rather
      // than duplicating the card.
      bugs: insertSorted(columns[to].bugs.filter((b) => b._id !== bug._id), bug, sort),
      total: columns[to].total + 1,
    },
  };
}

function BoardCard({ bug, index, editable, dragging, pending, onDragStart, onDragEnd, onMove, onTag }) {
  const at = STATUSES.indexOf(bug.status);
  const previous = STATUSES[at - 1];
  const next = STATUSES[at + 1];

  return (
    <li
      className="board-card rise"
      style={{ "--i": index }}
      draggable={editable}
      data-draggable={editable || undefined}
      data-dragging={dragging || undefined}
      data-pending={pending || undefined}
      onDragStart={editable ? onDragStart : undefined}
      onDragEnd={editable ? onDragEnd : undefined}
      aria-roledescription={editable ? "Draggable bug card" : undefined}
    >
      <div className="flex items-start gap-1">
        <span className="mono text-2xs text-fg-subtle">{bug.key}</span>

        {editable && (
          <span className="board-move -mr-1.5 -mt-1 ml-auto flex shrink-0">
            <button
              type="button"
              className="btn-icon size-6"
              disabled={!previous}
              onClick={() => onMove(bug, previous)}
              title={previous ? `Move to ${previous}` : undefined}
              aria-label={
                previous ? `Move ${bug.key} to ${previous}` : `${bug.key} is in the first column`
              }
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="btn-icon size-6"
              disabled={!next}
              onClick={() => onMove(bug, next)}
              title={next ? `Move to ${next}` : undefined}
              aria-label={next ? `Move ${bug.key} to ${next}` : `${bug.key} is in the last column`}
            >
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        )}
      </div>

      {/* A link is draggable by default and would hijack the drag with its own
          URL payload; disabling that lets the dragstart reach the card. */}
      <Link
        to={`/bugs/${bug._id}`}
        draggable={false}
        className="mt-0.5 block text-sm font-semibold text-fg transition-colors hover:text-brand-fg"
      >
        <span className="line-clamp-2">{bug.title}</span>
      </Link>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <PriorityBadge value={bug.priority} />
        {bug.tags.slice(0, 2).map((tag) => (
          <button key={tag} type="button" className="chip" onClick={() => onTag(tag)}>
            <span className="text-fg-subtle">#</span>
            {tag}
          </button>
        ))}
        {bug.tags.length > 2 && <span className="text-2xs text-fg-subtle">+{bug.tags.length - 2}</span>}
      </div>

      <div className="mt-2.5 flex items-center gap-2 border-t border-line pt-2 text-2xs text-fg-subtle">
        <Avatar user={bug.assignee} size={20} />
        <time dateTime={bug.updatedAt}>{timeAgo(bug.updatedAt)}</time>
        <span className="ml-auto flex items-center gap-2">
          {bug.commentCount > 0 && (
            <span className="flex items-center gap-1" title={`${bug.commentCount} comments`}>
              <MessageSquare className="size-3" aria-hidden="true" />
              {bug.commentCount}
            </span>
          )}
          {bug.attachments?.length > 0 && (
            <span className="flex items-center gap-1" title={`${bug.attachments.length} attachments`}>
              <Paperclip className="size-3" aria-hidden="true" />
              {bug.attachments.length}
            </span>
          )}
        </span>
      </div>
    </li>
  );
}

export default function Board() {
  const { user } = useAuth();
  const toast = useToast();
  const { filters, updateFilter, clearFilters, sharedSearch, activeFilterCount } =
    useBugFilters(BOARD_DEFAULTS);

  const [columns, setColumns] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(filters.q);
  const [dragging, setDragging] = useState(null);
  const [over, setOver] = useState(null);
  const [pending, setPending] = useState(() => new Set());
  const [announcement, setAnnouncement] = useState("");

  // Five requests land out of order; only the newest batch may paint.
  const requestId = useRef(0);

  useEffect(() => setSearch(filters.q), [filters.q]);

  useEffect(() => {
    const token = ++requestId.current;
    setError("");
    Promise.all(
      STATUSES.map((status) =>
        api
          .get("/bugs", { params: { ...filters, status, limit: COLUMN_LIMIT } })
          .then(({ data }) => [status, { bugs: data.bugs, total: data.pagination.total }])
      )
    )
      .then((entries) => {
        if (token === requestId.current) setColumns(Object.fromEntries(entries));
      })
      .catch((err) => {
        if (token === requestId.current) setError(errorMessage(err, "Could not load the board"));
      });
  }, [filters]);

  useEffect(() => {
    api.get("/users").then(({ data }) => setUsers(data.users)).catch(() => {});
  }, []);

  // Debounced so typing does not fire five requests per keystroke.
  useEffect(() => {
    if (search === filters.q) return undefined;
    const timer = setTimeout(() => updateFilter({ q: search }), 350);
    return () => clearTimeout(timer);
  }, [search, filters.q, updateFilter]);

  const byId = useMemo(() => {
    const map = new Map();
    for (const column of Object.values(columns || {})) {
      for (const bug of column.bugs) map.set(bug._id, bug);
    }
    return map;
  }, [columns]);

  const total = useMemo(
    () => Object.values(columns || {}).reduce((sum, column) => sum + column.total, 0),
    [columns]
  );

  const setBusy = (id, busy) =>
    setPending((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });

  const move = async (bug, to) => {
    if (!bug || !to || bug.status === to) return;
    // The API re-checks this; catching it here saves a round trip and a card
    // that visibly snaps back.
    if (!canEditBug(user, bug)) {
      toast.error(`Only the reporter, the assignee, or a developer can move ${bug.key}`);
      return;
    }

    const from = bug.status;
    const optimistic = { ...bug, status: to, updatedAt: new Date().toISOString() };

    setColumns((current) => transfer(current, optimistic, from, to, filters.sort));
    setBusy(bug._id, true);
    setAnnouncement(`${bug.key} moved to ${to}`);

    try {
      const { data } = await api.patch(`/bugs/${bug._id}`, { status: to });
      // Swap in the server's copy for the real updatedAt and resolvedAt.
      setColumns(
        (current) =>
          current && {
            ...current,
            [to]: {
              ...current[to],
              bugs: current[to].bugs.map((b) => (b._id === data.bug._id ? data.bug : b)),
            },
          }
      );
    } catch (err) {
      // Undo this one move rather than restoring a snapshot, so a second card
      // dropped while this request was in flight keeps its new column.
      setColumns((current) => transfer(current, bug, to, from, filters.sort));
      setAnnouncement(`${bug.key} moved back to ${from}`);
      toast.error(errorMessage(err, `Could not move ${bug.key}`));
    } finally {
      setBusy(bug._id, false);
    }
  };

  const columnProps = (status) => ({
    onDragOver: (event) => {
      if (!dragging) return;
      // preventDefault is what marks this element as a valid drop target.
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      if (over !== status) setOver(status);
    },
    onDragLeave: (event) => {
      // dragleave also fires when the pointer crosses into a child element.
      if (event.currentTarget.contains(event.relatedTarget)) return;
      setOver((current) => (current === status ? null : current));
    },
    onDrop: (event) => {
      event.preventDefault();
      const id = event.dataTransfer.getData("text/plain") || dragging?.id;
      setOver(null);
      setDragging(null);
      move(byId.get(id), status);
    },
  });

  return (
    <div className="mx-auto max-w-[96rem] space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Board</h1>
          <p className="text-sm text-fg-muted">
            {columns ? `${total} ${total === 1 ? "bug" : "bugs"} · ` : ""}
            drag a card to another column to change its status
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewSwitch current="board" search={sharedSearch} />
          <Link to="/bugs/new" className="btn-primary">
            Report a bug
          </Link>
        </div>
      </header>

      <Alert>{error}</Alert>

      <section className="card p-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
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
              Order cards by
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

        {(filters.tags || activeFilterCount > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {filters.tags && (
              <span className="flex flex-wrap items-center gap-1.5">
                {filters.tags
                  .split(",")
                  .filter(Boolean)
                  .map((tag) => (
                    <Tag
                      key={tag}
                      value={tag}
                      onRemove={() =>
                        updateFilter({
                          tags: filters.tags
                            .split(",")
                            .filter((t) => t !== tag)
                            .join(","),
                        })
                      }
                    />
                  ))}
              </span>
            )}
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="link ml-auto text-sm">
                Clear filters
              </button>
            )}
          </div>
        )}
      </section>

      {/* Drag-and-drop is silent to a screen reader; the move buttons on each
          card announce their result here instead. */}
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      {!columns ? (
        <BoardSkeleton />
      ) : (
        <div className="board">
          {STATUSES.map((status) => {
            const column = columns[status];
            const hidden = column.total - column.bugs.length;
            return (
              <section
                key={status}
                className="board-column"
                data-over={over === status || undefined}
                aria-label={`${status}, ${column.total} ${column.total === 1 ? "bug" : "bugs"}`}
                {...columnProps(status)}
              >
                <header className="board-column-head">
                  <StatusBadge value={status} />
                  <span className="tabular ml-auto text-xs font-semibold text-fg-subtle">
                    {column.total}
                  </span>
                </header>

                <ul className="board-column-body">
                  {column.bugs.map((bug, index) => (
                    <BoardCard
                      key={bug._id}
                      bug={bug}
                      index={index}
                      editable={canEditBug(user, bug)}
                      dragging={dragging?.id === bug._id}
                      pending={pending.has(bug._id)}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", bug._id);
                        event.dataTransfer.effectAllowed = "move";
                        setDragging({ id: bug._id, from: bug.status });
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                      onMove={move}
                      onTag={(tag) => updateFilter({ tags: tag })}
                    />
                  ))}

                  {column.bugs.length === 0 && (
                    <li className="flex flex-1 items-center justify-center rounded-md border border-dashed border-line-strong p-4 text-center text-xs text-fg-subtle">
                      {over === status ? "Drop to move here" : "Nothing here"}
                    </li>
                  )}

                  {hidden > 0 && (
                    <li className="pt-1 text-center">
                      <Link to={`/bugs?status=${encodeURIComponent(status)}`} className="link text-xs">
                        {hidden} more in the table view
                      </Link>
                    </li>
                  )}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
