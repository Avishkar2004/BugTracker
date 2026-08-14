import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api/client.js";
import { Alert, Tag } from "../components/ui.jsx";
import { PRIORITIES } from "../lib/constants.js";
import { formatBytes } from "../lib/format.js";

const BLANK = {
  title: "",
  description: "",
  stepsToReproduce: "",
  environment: "",
  priority: "Medium",
  assignee: "",
};

export default function NewBug() {
  const navigate = useNavigate();
  const [form, setForm] = useState(BLANK);
  const [tags, setTags] = useState([]);
  const [tagDraft, setTagDraft] = useState("");
  const [files, setFiles] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get("/users").then(({ data }) => setUsers(data.users)).catch(() => {});
  }, []);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const commitTag = () => {
    const value = tagDraft.trim().toLowerCase().replace(/^#/, "");
    if (value && !tags.includes(value)) setTags([...tags, value]);
    setTagDraft("");
  };

  const onTagKeyDown = (event) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitTag();
    } else if (event.key === "Backspace" && !tagDraft && tags.length) {
      setTags(tags.slice(0, -1));
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => value && payload.append(key, value));
    if (tags.length) payload.append("tags", tags.join(","));
    files.forEach((file) => payload.append("attachments", file));

    try {
      const { data } = await api.post("/bugs", payload);
      navigate(`/bugs/${data.bug._id}`, { replace: true });
    } catch (err) {
      setError(errorMessage(err, "Could not create the bug"));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Report a bug</h1>
        <p className="text-sm text-ink-500">
          The more reproducible the report, the faster it gets fixed.
        </p>
      </header>

      <form onSubmit={submit} className="card space-y-5 p-6">
        <Alert>{error}</Alert>

        <div>
          <label className="label" htmlFor="title">
            Title *
          </label>
          <input
            id="title"
            required
            maxLength={160}
            className="field"
            placeholder="Short summary of what goes wrong"
            value={form.title}
            onChange={set("title")}
          />
        </div>

        <div>
          <label className="label" htmlFor="description">
            Description *
          </label>
          <textarea
            id="description"
            required
            rows={5}
            className="field"
            placeholder="What did you expect to happen, and what happened instead?"
            value={form.description}
            onChange={set("description")}
          />
        </div>

        <div>
          <label className="label" htmlFor="steps">
            Steps to reproduce
          </label>
          <textarea
            id="steps"
            rows={4}
            className="field font-mono text-xs"
            placeholder={"1. Go to …\n2. Click …\n3. Observe …"}
            value={form.stepsToReproduce}
            onChange={set("stepsToReproduce")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="priority">
              Priority
            </label>
            <select id="priority" className="field" value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="assignee">
              Assignee
            </label>
            <select id="assignee" className="field" value={form.assignee} onChange={set("assignee")}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="environment">
              Environment
            </label>
            <input
              id="environment"
              className="field"
              placeholder="Chrome 131, Windows 11"
              value={form.environment}
              onChange={set("environment")}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tags">
            Tags
          </label>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-ink-200 bg-white p-2">
            {tags.map((tag) => (
              <Tag key={tag} value={tag} onRemove={() => setTags(tags.filter((t) => t !== tag))} />
            ))}
            <input
              id="tags"
              className="min-w-32 flex-1 border-0 px-1 py-0.5 text-sm outline-none"
              placeholder={tags.length ? "" : "auth, ui, api — press Enter after each"}
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={onTagKeyDown}
              onBlur={commitTag}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="attachments">
            Attachments
          </label>
          <input
            id="attachments"
            type="file"
            multiple
            className="field file:mr-3 file:rounded-md file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
            onChange={(e) => setFiles([...e.target.files].slice(0, 5))}
          />
          {files.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-ink-500">
              {files.map((file) => (
                <li key={file.name}>
                  {file.name} · {formatBytes(file.size)}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-ink-500">
            Up to 5 files. Images, PDF, text, JSON, CSV or ZIP.
          </p>
        </div>

        <div className="flex gap-2 border-t border-ink-200 pt-4">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Submitting…" : "Submit bug report"}
          </button>
          <Link to="/bugs" className="btn-ghost">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
