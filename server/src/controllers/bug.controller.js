import mongoose from "mongoose";
import Bug, { PRIORITIES, STATUSES } from "../models/Bug.js";
import Comment from "../models/Comment.js";
import Activity from "../models/Activity.js";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { toCsv } from "../utils/csv.js";
import { withResolvedNames } from "../utils/activityNames.js";

const USER_FIELDS = "name email role avatarColor";
const SORTABLE = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  updated: { updatedAt: -1 },
  priority: { priorityRank: 1, createdAt: -1 },
  title: { title: 1 },
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toList = (value) =>
  (Array.isArray(value) ? value : String(value ?? "").split(","))
    .map((v) => String(v).trim())
    .filter(Boolean);

/** Turns query-string params into a Mongo filter document. */
function buildFilter(query, currentUserId) {
  const filter = {};

  if (query.q) {
    const rx = new RegExp(escapeRegex(String(query.q).trim()), "i");
    filter.$or = [{ title: rx }, { description: rx }, { key: rx }, { tags: rx }];
  }

  const status = toList(query.status).filter((s) => STATUSES.includes(s));
  if (status.length) filter.status = { $in: status };

  const priority = toList(query.priority).filter((p) => PRIORITIES.includes(p));
  if (priority.length) filter.priority = { $in: priority };

  if (query.assignee === "unassigned") filter.assignee = null;
  else if (query.assignee === "me") filter.assignee = currentUserId;
  else if (query.assignee && mongoose.isValidObjectId(query.assignee)) filter.assignee = query.assignee;

  if (query.reporter === "me") filter.reporter = currentUserId;
  else if (query.reporter && mongoose.isValidObjectId(query.reporter)) filter.reporter = query.reporter;

  const tags = toList(query.tags).map((t) => t.toLowerCase());
  if (tags.length) filter.tags = { $all: tags };

  if (query.open === "true") filter.status = { $nin: ["Resolved", "Closed"] };

  return filter;
}

/** Priority is stored as a label, so sorting by it needs an explicit rank. */
function priorityRankStage() {
  return {
    $addFields: {
      priorityRank: { $indexOfArray: [PRIORITIES, "$priority"] },
    },
  };
}

async function logActivity(entries) {
  const list = entries.filter(Boolean);
  if (list.length) await Activity.insertMany(list);
}

function canEdit(user, bug) {
  if (["admin", "developer"].includes(user.role)) return true;
  return (
    String(bug.reporter?._id ?? bug.reporter) === String(user._id) ||
    String(bug.assignee?._id ?? bug.assignee) === String(user._id)
  );
}

export const listBugs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const sort = SORTABLE[req.query.sort] || SORTABLE.newest;
  const filter = buildFilter(req.query, req.user._id);

  const [bugs, total] = await Promise.all([
    Bug.aggregate([
      { $match: filter },
      priorityRankStage(),
      { $sort: sort },
      { $skip: (page - 1) * limit },
      { $limit: limit },
    ]).then((docs) =>
      Bug.populate(docs, [
        { path: "reporter", select: USER_FIELDS },
        { path: "assignee", select: USER_FIELDS },
      ])
    ),
    Bug.countDocuments(filter),
  ]);

  res.json({
    bugs,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
});

export const getBug = asyncHandler(async (req, res) => {
  const bug = await Bug.findById(req.params.id)
    .populate("reporter", USER_FIELDS)
    .populate("assignee", USER_FIELDS);
  if (!bug) throw ApiError.notFound("Bug not found");
  res.json({ bug });
});

export const createBug = asyncHandler(async (req, res) => {
  const { title, description, stepsToReproduce, environment, priority, status, assignee, tags, dueDate } =
    req.body;

  if (assignee && !(await User.exists({ _id: assignee }))) {
    throw ApiError.badRequest("Assignee is not a known user");
  }

  const bug = await Bug.create({
    title,
    description,
    stepsToReproduce,
    environment,
    priority: PRIORITIES.includes(priority) ? priority : "Medium",
    status: STATUSES.includes(status) ? status : "New",
    assignee: assignee || null,
    tags: toList(tags).map((t) => t.toLowerCase()),
    dueDate: dueDate || null,
    reporter: req.user._id,
    attachments: (req.files || []).map((f) => ({
      filename: f.filename,
      originalName: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      url: `/uploads/${f.filename}`,
    })),
  });

  await logActivity([
    { bug: bug._id, actor: req.user._id, type: "created", note: bug.key },
    bug.assignee && {
      bug: bug._id,
      actor: req.user._id,
      type: "assigned",
      field: "assignee",
      to: String(bug.assignee),
    },
  ]);

  await bug.populate([
    { path: "reporter", select: USER_FIELDS },
    { path: "assignee", select: USER_FIELDS },
  ]);
  res.status(201).json({ bug });
});

export const updateBug = asyncHandler(async (req, res) => {
  const bug = await Bug.findById(req.params.id);
  if (!bug) throw ApiError.notFound("Bug not found");
  if (!canEdit(req.user, bug)) {
    throw ApiError.forbidden("Only the reporter, the assignee, or a developer/admin can edit this bug");
  }

  const activities = [];
  const { title, description, stepsToReproduce, environment, priority, status, assignee, tags, dueDate } =
    req.body;

  if (status !== undefined && status !== bug.status) {
    if (!STATUSES.includes(status)) throw ApiError.badRequest(`Status must be one of: ${STATUSES.join(", ")}`);
    activities.push({ type: "status_changed", field: "status", from: bug.status, to: status });
    bug.status = status;
  }

  if (priority !== undefined && priority !== bug.priority) {
    if (!PRIORITIES.includes(priority)) {
      throw ApiError.badRequest(`Priority must be one of: ${PRIORITIES.join(", ")}`);
    }
    activities.push({ type: "priority_changed", field: "priority", from: bug.priority, to: priority });
    bug.priority = priority;
  }

  if (assignee !== undefined) {
    const next = assignee || null;
    if (String(next) !== String(bug.assignee ?? "")) {
      if (next && !(await User.exists({ _id: next }))) {
        throw ApiError.badRequest("Assignee is not a known user");
      }
      activities.push({
        type: next ? "assigned" : "unassigned",
        field: "assignee",
        from: bug.assignee ? String(bug.assignee) : null,
        to: next ? String(next) : null,
      });
      bug.assignee = next;
    }
  }

  if (tags !== undefined) {
    const nextTags = toList(tags).map((t) => t.toLowerCase());
    if (nextTags.join(",") !== bug.tags.join(",")) {
      activities.push({
        type: "tags_changed",
        field: "tags",
        from: bug.tags.join(", "),
        to: nextTags.join(", "),
      });
      bug.tags = nextTags;
    }
  }

  const textFields = { title, description, stepsToReproduce, environment };
  for (const [field, value] of Object.entries(textFields)) {
    if (value !== undefined && value !== bug[field]) {
      activities.push({ type: "edited", field });
      bug[field] = value;
    }
  }

  if (dueDate !== undefined) bug.dueDate = dueDate || null;

  await bug.save();
  await logActivity(activities.map((a) => ({ ...a, bug: bug._id, actor: req.user._id })));

  await bug.populate([
    { path: "reporter", select: USER_FIELDS },
    { path: "assignee", select: USER_FIELDS },
  ]);
  res.json({ bug });
});

export const deleteBug = asyncHandler(async (req, res) => {
  const bug = await Bug.findById(req.params.id);
  if (!bug) throw ApiError.notFound("Bug not found");

  await Promise.all([
    Comment.deleteMany({ bug: bug._id }),
    Activity.deleteMany({ bug: bug._id }),
    bug.deleteOne(),
  ]);

  res.json({ message: `${bug.key} deleted` });
});

/** Applies one change to many bugs at once (status, priority, assignee, or add/remove tag). */
export const bulkUpdate = asyncHandler(async (req, res) => {
  const { ids, status, priority, assignee, addTags, removeTags } = req.body;
  const validIds = toList(ids).filter((id) => mongoose.isValidObjectId(id));
  if (!validIds.length) throw ApiError.badRequest("Provide at least one bug id");

  const set = {};
  if (status !== undefined) {
    if (!STATUSES.includes(status)) throw ApiError.badRequest("Invalid status");
    set.status = status;
    set.resolvedAt = ["Resolved", "Closed"].includes(status) ? new Date() : null;
  }
  if (priority !== undefined) {
    if (!PRIORITIES.includes(priority)) throw ApiError.badRequest("Invalid priority");
    set.priority = priority;
  }
  if (assignee !== undefined) {
    if (assignee && !(await User.exists({ _id: assignee }))) {
      throw ApiError.badRequest("Assignee is not a known user");
    }
    set.assignee = assignee || null;
  }

  const add = toList(addTags).map((t) => t.toLowerCase());
  const remove = toList(removeTags).map((t) => t.toLowerCase());

  const update = {};
  if (Object.keys(set).length) update.$set = set;
  if (add.length) update.$addToSet = { tags: { $each: add } };

  if (!Object.keys(update).length && !remove.length) throw ApiError.badRequest("Nothing to update");

  const scope = { _id: { $in: validIds } };
  const bugs = await Bug.find(scope).select("status priority assignee");

  let modified = 0;
  if (Object.keys(update).length) {
    modified = (await Bug.updateMany(scope, update)).modifiedCount;
  }
  // $addToSet and $pullAll cannot touch `tags` in the same update document.
  if (remove.length) {
    const pulled = (await Bug.updateMany(scope, { $pullAll: { tags: remove } })).modifiedCount;
    modified = Math.max(modified, pulled);
  }

  const activities = bugs.flatMap((bug) => {
    const entries = [];
    if (set.status && set.status !== bug.status) {
      entries.push({ type: "status_changed", field: "status", from: bug.status, to: set.status });
    }
    if (set.priority && set.priority !== bug.priority) {
      entries.push({ type: "priority_changed", field: "priority", from: bug.priority, to: set.priority });
    }
    if (set.assignee !== undefined && String(set.assignee ?? "") !== String(bug.assignee ?? "")) {
      entries.push({
        type: set.assignee ? "assigned" : "unassigned",
        field: "assignee",
        from: bug.assignee ? String(bug.assignee) : null,
        to: set.assignee ? String(set.assignee) : null,
      });
    }
    if (add.length || remove.length) {
      entries.push({ type: "tags_changed", field: "tags", to: [...add].join(", ") || null });
    }
    return entries.map((e) => ({ ...e, bug: bug._id, actor: req.user._id }));
  });

  await logActivity(activities);
  res.json({ message: `${modified} bug(s) updated`, modified });
});

export const addAttachments = asyncHandler(async (req, res) => {
  const bug = await Bug.findById(req.params.id);
  if (!bug) throw ApiError.notFound("Bug not found");
  if (!req.files?.length) throw ApiError.badRequest("No files were uploaded");

  const added = req.files.map((f) => ({
    filename: f.filename,
    originalName: f.originalname,
    mimetype: f.mimetype,
    size: f.size,
    url: `/uploads/${f.filename}`,
  }));

  bug.attachments.push(...added);
  await bug.save();
  await logActivity(
    added.map((a) => ({
      bug: bug._id,
      actor: req.user._id,
      type: "attachment_added",
      note: a.originalName,
    }))
  );

  res.status(201).json({ attachments: bug.attachments });
});

export const listComments = asyncHandler(async (req, res) => {
  const comments = await Comment.find({ bug: req.params.id })
    .populate("author", USER_FIELDS)
    .sort({ createdAt: 1 });
  res.json({ comments });
});

export const addComment = asyncHandler(async (req, res) => {
  const bug = await Bug.findById(req.params.id);
  if (!bug) throw ApiError.notFound("Bug not found");

  const comment = await Comment.create({
    bug: bug._id,
    author: req.user._id,
    body: req.body.body,
  });

  await Bug.updateOne({ _id: bug._id }, { $inc: { commentCount: 1 } });
  await logActivity([{ bug: bug._id, actor: req.user._id, type: "commented" }]);

  await comment.populate("author", USER_FIELDS);
  res.status(201).json({ comment });
});

export const deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) throw ApiError.notFound("Comment not found");
  if (String(comment.author) !== String(req.user._id) && req.user.role !== "admin") {
    throw ApiError.forbidden("You can only delete your own comments");
  }

  await comment.deleteOne();
  await Bug.updateOne({ _id: comment.bug }, { $inc: { commentCount: -1 } });
  res.json({ message: "Comment deleted" });
});

export const listActivity = asyncHandler(async (req, res) => {
  const activity = await Activity.find({ bug: req.params.id })
    .populate("actor", USER_FIELDS)
    .sort({ createdAt: -1 })
    .limit(200);

  res.json({ activity: await withResolvedNames(activity) });
});

const EXPORT_COLUMNS = [
  { key: "key", label: "Key" },
  { key: "title", label: "Title" },
  { key: "status", label: "Status" },
  { key: "priority", label: "Priority" },
  { key: "reporter", label: "Reporter" },
  { key: "assignee", label: "Assignee" },
  { key: "tags", label: "Tags" },
  { key: "comments", label: "Comments" },
  { key: "createdAt", label: "Created" },
  { key: "updatedAt", label: "Updated" },
  { key: "resolvedAt", label: "Resolved" },
];

export const exportBugs = asyncHandler(async (req, res) => {
  const format = String(req.query.format || "csv").toLowerCase();
  const filter = buildFilter(req.query, req.user._id);

  const bugs = await Bug.find(filter)
    .populate("reporter", "name")
    .populate("assignee", "name")
    .sort({ createdAt: -1 })
    .limit(5000);

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    res.setHeader("Content-Disposition", `attachment; filename="bugs-${stamp}.json"`);
    return res.type("application/json").send(JSON.stringify(bugs, null, 2));
  }

  const rows = bugs.map((b) => ({
    key: b.key,
    title: b.title,
    status: b.status,
    priority: b.priority,
    reporter: b.reporter?.name || "",
    assignee: b.assignee?.name || "Unassigned",
    tags: b.tags.join(" "),
    comments: b.commentCount,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    resolvedAt: b.resolvedAt ? b.resolvedAt.toISOString() : "",
  }));

  res.setHeader("Content-Disposition", `attachment; filename="bugs-${stamp}.csv"`);
  res.type("text/csv").send(toCsv(rows, EXPORT_COLUMNS));
});
