import mongoose from "mongoose";

export const ACTIVITY_TYPES = [
  "created",
  "status_changed",
  "priority_changed",
  "assigned",
  "unassigned",
  "commented",
  "tags_changed",
  "attachment_added",
  "edited",
  "deleted",
];

const activitySchema = new mongoose.Schema(
  {
    bug: { type: mongoose.Schema.Types.ObjectId, ref: "Bug", required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ACTIVITY_TYPES, required: true },
    field: { type: String, default: null },
    from: { type: String, default: null },
    to: { type: String, default: null },
    note: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ createdAt: -1 });

activitySchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Activity", activitySchema);
