import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errorMessage } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Alert, Avatar, PriorityBadge, Spinner, StatusBadge, Tag } from "../components/ui.jsx";
import { PRIORITIES, STATUSES } from "../lib/constants.js";
import { formatBytes, formatDate, timeAgo } from "../lib/format.js";

const ACTIVITY_TEXT = {
  created: () => "reported this bug",
  status_changed: (a) => `changed status from ${a.from} to ${a.to}`,
  priority_changed: (a) => `changed priority from ${a.from} to ${a.to}`,
  assigned: (a) => `assigned this to ${a.to}`,
  unassigned: () => "removed the assignee",
  commented: () => "commented",
  tags_changed: (a) => `set tags to ${a.to || "none"}`,
  attachment_added: (a) => `attached ${a.note}`,
  edited: (a) => `edited the ${a.field}`,
};

function Section({ title, children, actions }) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink-700">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

export default function BugDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [bug, setBug] = useState(null);
  const [comments, setComments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [users, setUsers] = useState([]);
  const [draft, setDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const [bugRes, commentRes, activityRes] = await Promise.all([
        api.get(`/bugs/${id}`),
        api.get(`/bugs/${id}/comments`),
        api.get(`/bugs/${id}/activity`),
      ]);
      setBug(bugRes.data.bug);
      setComments(commentRes.data.comments);
      setActivity(activityRes.data.activity);
    } catch (err) {
      setError(errorMessage(err, "Could not load this bug"));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api.get("/users").then(({ data }) => setUsers(data.users)).catch(() => {});
  }, []);

  const patch = async (changes) => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.patch(`/bugs/${id}`, changes);
      setBug(data.bug);
      const { data: activityData } = await api.get(`/bugs/${id}/activity`);
      setActivity(activityData.activity);
    } catch (err) {
      setError(errorMessage(err, "Could not save that change"));
    } finally {
      setBusy(false);
    }
  };

  const postComment = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/bugs/${id}/comments`, { body: draft.trim() });
      setComments((prev) => [...prev, data.comment]);
      setDraft("");
      const { data: activityData } = await api.get(`/bugs/${id}/activity`);
      setActivity(activityData.activity);
    } catch (err) {
      setError(errorMessage(err, "Could not post your comment"));
    } finally {
      setBusy(false);
    }
  };

  const removeComment = async (commentId) => {
    try {
      await api.delete(`/bugs/${id}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch (err) {
      setError(errorMessage(err, "Could not delete that comment"));
    }
  };

  const uploadFiles = async (fileList) => {
    if (!fileList.length) return;
    const payload = new FormData();
    [...fileList].slice(0, 5).forEach((file) => payload.append("attachments", file));
    setBusy(true);
    try {
      const { data } = await api.post(`/bugs/${id}/attachments`, payload);
      setBug((prev) => ({ ...prev, attachments: data.attachments }));
    } catch (err) {
      setError(errorMessage(err, "Upload failed"));
    } finally {
      setBusy(false);
    }
  };

  const removeBug = async () => {
    if (!window.confirm(`Delete ${bug.key} permanently? This also removes its comments and history.`)) {
      return;
    }
    try {
      await api.delete(`/bugs/${id}`);
      navigate("/bugs", { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Could not delete this bug"));
    }
  };

  const startEditing = () => {
    setEditForm({
      title: bug.title,
      description: bug.description,
      stepsToReproduce: bug.stepsToReproduce || "",
      environment: bug.environment || "",
    });
    setEditing(true);
  };

  const saveEdits = async (event) => {
    event.preventDefault();
    await patch(editForm);
    setEditing(false);
  };

  if (error && !bug) return <Alert>{error}</Alert>;
  if (!bug) return <Spinner label="Loading bug…" />;

  const canEdit =
    ["admin", "developer"].includes(user.role) ||
    bug.reporter?._id === user._id ||
    bug.assignee?._id === user._id;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <Link to="/bugs" className="text-sm font-medium text-indigo-600 hover:underline">
        ← Back to all bugs
      </Link>

      <Alert>{error}</Alert>

      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-ink-500">{bug.key}</p>
            {editing ? null : (
              <h1 className="mt-1 text-xl font-bold tracking-tight">{bug.title}</h1>
            )}
            <p className="mt-1.5 text-sm text-ink-500">
              Reported by <span className="font-medium text-ink-700">{bug.reporter?.name}</span>{" "}
              {timeAgo(bug.createdAt)} · updated {timeAgo(bug.updatedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge value={bug.status} />
            <PriorityBadge value={bug.priority} />
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          {editing ? (
            <form onSubmit={saveEdits} className="card space-y-4 p-5">
              <div>
                <label className="label" htmlFor="edit-title">
                  Title
                </label>
                <input
                  id="edit-title"
                  className="field"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="edit-description">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  rows={5}
                  className="field"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="edit-steps">
                  Steps to reproduce
                </label>
                <textarea
                  id="edit-steps"
                  rows={4}
                  className="field font-mono text-xs"
                  value={editForm.stepsToReproduce}
                  onChange={(e) => setEditForm({ ...editForm, stepsToReproduce: e.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="edit-env">
                  Environment
                </label>
                <input
                  id="edit-env"
                  className="field"
                  value={editForm.environment}
                  onChange={(e) => setEditForm({ ...editForm, environment: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={busy}>
                  Save changes
                </button>
                <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <Section
                title="Description"
                actions={
                  canEdit && (
                    <button type="button" onClick={startEditing} className="text-sm text-indigo-600 hover:underline">
                      Edit
                    </button>
                  )
                }
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                  {bug.description}
                </p>
                {bug.environment && (
                  <p className="mt-3 text-xs text-ink-500">
                    <span className="font-semibold uppercase tracking-wide">Environment</span> ·{" "}
                    {bug.environment}
                  </p>
                )}
              </Section>

              {bug.stepsToReproduce && (
                <Section title="Steps to reproduce">
                  <pre className="whitespace-pre-wrap rounded-lg bg-ink-50 p-3 font-mono text-xs leading-relaxed text-ink-700">
                    {bug.stepsToReproduce}
                  </pre>
                </Section>
              )}
            </>
          )}

          <Section
            title={`Attachments (${bug.attachments.length})`}
            actions={
              <label className="cursor-pointer text-sm text-indigo-600 hover:underline">
                Add files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => uploadFiles(e.target.files)}
                />
              </label>
            }
          >
            {bug.attachments.length === 0 ? (
              <p className="text-sm text-ink-500">No files attached yet.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {bug.attachments.map((file) => (
                  <li key={file.filename}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-3 rounded-lg border border-ink-200 p-2 hover:border-indigo-300"
                    >
                      {file.mimetype?.startsWith("image/") ? (
                        <img src={file.url} alt="" className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded bg-ink-100 text-sm">
                          📄
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-ink-700">{file.originalName}</span>
                        <span className="text-xs text-ink-500">{formatBytes(file.size)}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={`Comments (${comments.length})`}>
            <ul className="space-y-4">
              {comments.map((comment) => (
                <li key={comment._id} className="flex gap-3">
                  <Avatar user={comment.author} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-semibold text-ink-900">{comment.author?.name}</span>{" "}
                      <span className="text-xs text-ink-500">{timeAgo(comment.createdAt)}</span>
                      {(comment.author?._id === user._id || user.role === "admin") && (
                        <button
                          type="button"
                          onClick={() => removeComment(comment._id)}
                          className="ml-2 text-xs text-ink-500 hover:text-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
                      {comment.body}
                    </p>
                  </div>
                </li>
              ))}
              {comments.length === 0 && (
                <li className="text-sm text-ink-500">No comments yet — start the conversation.</li>
              )}
            </ul>

            <form onSubmit={postComment} className="mt-4 border-t border-ink-100 pt-4">
              <textarea
                rows={3}
                className="field"
                placeholder="Add context, a repro note, or a fix plan…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
              <button type="submit" className="btn-primary mt-2" disabled={busy || !draft.trim()}>
                Post comment
              </button>
            </form>
          </Section>
        </div>

        <aside className="space-y-4">
          <Section title="Details">
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="status-select">
                  Status
                </label>
                <select
                  id="status-select"
                  className="field"
                  disabled={!canEdit || busy}
                  value={bug.status}
                  onChange={(e) => patch({ status: e.target.value })}
                >
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="priority-select">
                  Priority
                </label>
                <select
                  id="priority-select"
                  className="field"
                  disabled={!canEdit || busy}
                  value={bug.priority}
                  onChange={(e) => patch({ priority: e.target.value })}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label" htmlFor="assignee-select">
                  Assignee
                </label>
                <select
                  id="assignee-select"
                  className="field"
                  disabled={!canEdit || busy}
                  value={bug.assignee?._id || ""}
                  onChange={(e) => patch({ assignee: e.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="label">Tags</span>
                <div className="flex flex-wrap gap-1.5">
                  {bug.tags.map((tag) => (
                    <Tag
                      key={tag}
                      value={tag}
                      onRemove={canEdit ? () => patch({ tags: bug.tags.filter((t) => t !== tag) }) : undefined}
                    />
                  ))}
                  {bug.tags.length === 0 && <span className="text-sm text-ink-500">None</span>}
                </div>
                {canEdit && (
                  <input
                    className="field mt-2"
                    placeholder="Add a tag, press Enter"
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      const value = tagDraft.trim().toLowerCase().replace(/^#/, "");
                      if (value && !bug.tags.includes(value)) patch({ tags: [...bug.tags, value] });
                      setTagDraft("");
                    }}
                  />
                )}
              </div>

              <dl className="space-y-1 border-t border-ink-100 pt-3 text-xs text-ink-500">
                <div className="flex justify-between gap-2">
                  <dt>Created</dt>
                  <dd className="text-ink-700">{formatDate(bug.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Resolved</dt>
                  <dd className="text-ink-700">{formatDate(bug.resolvedAt)}</dd>
                </div>
              </dl>

              {user.role === "admin" && (
                <button type="button" onClick={removeBug} className="btn-danger w-full">
                  Delete bug
                </button>
              )}
            </div>
          </Section>

          <Section title="History">
            <ol className="space-y-3">
              {activity.map((entry) => (
                <li key={entry._id} className="flex gap-2.5 text-sm">
                  <Avatar user={entry.actor} size={22} />
                  <p className="min-w-0 text-ink-700">
                    <span className="font-medium">{entry.actor?.name}</span>{" "}
                    {(ACTIVITY_TEXT[entry.type] || (() => entry.type))(entry)}
                    <span className="block text-xs text-ink-500">{timeAgo(entry.createdAt)}</span>
                  </p>
                </li>
              ))}
            </ol>
          </Section>
        </aside>
      </div>
    </div>
  );
}
