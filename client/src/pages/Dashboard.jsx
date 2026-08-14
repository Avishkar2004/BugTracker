import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api/client.js";
import { Alert, Avatar, Spinner } from "../components/ui.jsx";
import { BarBreakdown, Donut, TrendChart } from "../components/charts.jsx";
import { PRIORITY_BARS, STATUS_BARS } from "../lib/constants.js";
import { formatHours, timeAgo } from "../lib/format.js";
import { useAuth } from "../context/AuthContext.jsx";

const ACTIVITY_TEXT = {
  created: () => "reported this bug",
  status_changed: (a) => `moved status ${a.from} → ${a.to}`,
  priority_changed: (a) => `changed priority ${a.from} → ${a.to}`,
  assigned: (a) => `assigned it to ${a.to}`,
  unassigned: () => "removed the assignee",
  commented: () => "left a comment",
  tags_changed: (a) => `updated tags to ${a.to || "none"}`,
  attachment_added: (a) => `attached ${a.note}`,
  edited: (a) => `edited the ${a.field}`,
};

function StatCard({ label, value, hint, tone = "default", to }) {
  const tones = {
    default: "text-ink-900",
    danger: "text-red-600",
    warn: "text-amber-600",
    good: "text-emerald-600",
  };
  const body = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={`mt-1.5 text-3xl font-bold tabular-nums ${tones[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
    </>
  );
  return to ? (
    <Link to={to} className="card p-4 transition hover:border-indigo-300 hover:shadow">
      {body}
    </Link>
  ) : (
    <div className="card p-4">{body}</div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/stats/overview", { params: { days: 14 } })
      .then(({ data }) => setStats(data))
      .catch((err) => setError(errorMessage(err, "Could not load dashboard stats")));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!stats) return <Spinner label="Crunching the numbers…" />;

  const { totals, byStatus, byPriority, trend, topAssignees, topTags, recentActivity } = stats;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-sm text-ink-500">Here is how the backlog looks right now.</p>
        </div>
        <Link to="/bugs/new" className="btn-primary">
          Report a bug
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Open" value={totals.open} hint={`${totals.total} total`} to="/bugs?open=true" />
        <StatCard
          label="Critical open"
          value={totals.critical}
          tone={totals.critical ? "danger" : "good"}
          hint="Needs attention first"
          to="/bugs?priority=Critical&open=true"
        />
        <StatCard
          label="Unassigned"
          value={totals.unassigned}
          tone={totals.unassigned ? "warn" : "good"}
          hint="Nobody owns these"
          to="/bugs?assignee=unassigned&open=true"
        />
        <StatCard label="Closed" value={totals.closed} tone="good" hint="Resolved or closed" />
        <StatCard
          label="Avg. resolution"
          value={formatHours(totals.avgResolutionHours)}
          hint="From report to resolved"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold text-ink-700">Bugs opened, last 14 days</h2>
          <TrendChart data={trend} />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-700">By priority</h2>
          <Donut data={byPriority} colors={PRIORITY_BARS} />
        </section>
      </div>

      {/* items-start keeps each card at its natural height instead of stretching to the tallest. */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-700">By status</h2>
          <BarBreakdown data={byStatus} colors={STATUS_BARS} />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-700">Open workload</h2>
          {topAssignees.length === 0 ? (
            <p className="text-sm text-ink-500">Nothing is assigned right now.</p>
          ) : (
            <ul className="space-y-3">
              {topAssignees.map(({ user: member, count }) => (
                <li key={member._id} className="flex items-center gap-3">
                  <Avatar user={member} />
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{member.name}</span>
                  <Link
                    to={`/bugs?assignee=${member._id}&open=true`}
                    className="rounded-md bg-ink-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-ink-700 hover:bg-ink-200"
                  >
                    {count}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {topTags.length > 0 && (
            <>
              <h3 className="mb-2 mt-6 text-sm font-semibold text-ink-700">Busiest tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {topTags.map(({ tag, count }) => (
                  <Link
                    key={tag}
                    to={`/bugs?tags=${tag}`}
                    className="rounded-md bg-ink-100 px-2 py-1 text-xs text-ink-700 hover:bg-indigo-100 hover:text-indigo-700"
                  >
                    #{tag} · {count}
                  </Link>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold text-ink-700">Recent activity</h2>
          <ul className="space-y-3">
            {recentActivity.map((entry) => (
              <li key={entry._id} className="flex gap-2.5 text-sm">
                <Avatar user={entry.actor} size={24} />
                <p className="min-w-0 text-ink-700">
                  <span className="font-medium">{entry.actor?.name}</span>{" "}
                  {(ACTIVITY_TEXT[entry.type] || (() => entry.type))(entry)}{" "}
                  {entry.bug && (
                    <Link to={`/bugs/${entry.bug._id}`} className="font-medium text-indigo-600 hover:underline">
                      {entry.bug.key}
                    </Link>
                  )}
                  <span className="block text-xs text-ink-500">{timeAgo(entry.createdAt)}</span>
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
