import mongoose from "mongoose";
import { nextSeq } from "./Counter.js";

export const PRIORITIES = ["Critical", "High", "Medium", "Low"];
export const STATUSES = ["New", "In Progress", "Testing", "Resolved", "Closed"];
export const CLOSED_STATUSES = ["Resolved", "Closed"];

const attachmentSchema = new mongoose.Schema(
  {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bugSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [160, "Title cannot exceed 160 characters"],
    },
    description: { type: String, required: [true, "Description is required"], trim: true },
    stepsToReproduce: { type: String, trim: true, default: "" },
    environment: { type: String, trim: true, default: "" },
    priority: { type: String, enum: PRIORITIES, default: "Medium" },
    status: { type: String, enum: STATUSES, default: "New" },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    tags: [{ type: String, trim: true, lowercase: true }],
    attachments: [attachmentSchema],
    commentCount: { type: Number, default: 0 },
    dueDate: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

bugSchema.index({ status: 1, priority: 1 });
bugSchema.index({ assignee: 1 });
bugSchema.index({ tags: 1 });
bugSchema.index({ createdAt: -1 });

bugSchema.pre("validate", async function (next) {
  if (this.isNew && !this.key) {
    this.key = `BUG-${await nextSeq("bug")}`;
  }
  next();
});

// Keep resolvedAt in sync with the status field, whichever route changes it.
bugSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.resolvedAt = CLOSED_STATUSES.includes(this.status) ? this.resolvedAt || new Date() : null;
  }
  next();
});

bugSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Bug", bugSchema);
