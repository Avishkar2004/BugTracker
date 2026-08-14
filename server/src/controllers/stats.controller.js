import Bug, { PRIORITIES, STATUSES, CLOSED_STATUSES } from "../models/Bug.js";
import Activity from "../models/Activity.js";
import asyncHandler from "../utils/asyncHandler.js";
import { withResolvedNames } from "../utils/activityNames.js";

const USER_FIELDS = "name email role avatarColor";

/** Turns [{_id, count}] into a dense map so the UI never has to handle gaps. */
function densify(rows, keys) {
  const found = new Map(rows.map((r) => [r._id, r.count]));
  return keys.map((key) => ({ key, count: found.get(key) || 0 }));
}

export const overview = asyncHandler(async (req, res) => {
  const days = Math.min(90, Math.max(7, Number(req.query.days) || 14));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  since.setHours(0, 0, 0, 0);

  const [byStatus, byPriority, resolution, trend, topAssignees, topTags, recent, total] =
    await Promise.all([
      Bug.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Bug.aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }]),
      Bug.aggregate([
        { $match: { resolvedAt: { $ne: null } } },
        {
          $group: {
            _id: null,
            avgHours: { $avg: { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 3600000] } },
            resolved: { $sum: 1 },
          },
        },
      ]),
      Bug.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            opened: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Bug.aggregate([
        { $match: { assignee: { $ne: null }, status: { $nin: CLOSED_STATUSES } } },
        { $group: { _id: "$assignee", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]).then((rows) => Bug.populate(rows, { path: "_id", select: USER_FIELDS, model: "User" })),
      Bug.aggregate([
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      Activity.find().populate("actor", USER_FIELDS).populate("bug", "key title").sort({ createdAt: -1 }).limit(12),
      Bug.countDocuments(),
    ]);

  const closed = byStatus
    .filter((s) => CLOSED_STATUSES.includes(s._id))
    .reduce((sum, s) => sum + s.count, 0);

  // Fill in days with zero activity so the trend line has no holes.
  const openedByDay = new Map(trend.map((t) => [t._id, t.opened]));
  const series = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const label = date.toISOString().slice(0, 10);
    series.push({ date: label, opened: openedByDay.get(label) || 0 });
  }

  res.json({
    totals: {
      total,
      open: total - closed,
      closed,
      unassigned: await Bug.countDocuments({ assignee: null, status: { $nin: CLOSED_STATUSES } }),
      critical: await Bug.countDocuments({ priority: "Critical", status: { $nin: CLOSED_STATUSES } }),
      avgResolutionHours: resolution[0]?.avgHours ? Number(resolution[0].avgHours.toFixed(1)) : null,
    },
    byStatus: densify(byStatus, STATUSES),
    byPriority: densify(byPriority, PRIORITIES),
    trend: series,
    topAssignees: topAssignees.map((row) => ({ user: row._id, count: row.count })),
    topTags: topTags.map((row) => ({ tag: row._id, count: row.count })),
    recentActivity: await withResolvedNames(recent),
  });
});
