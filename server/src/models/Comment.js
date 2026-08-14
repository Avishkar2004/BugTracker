import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    bug: { type: mongoose.Schema.Types.ObjectId, ref: "Bug", required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: {
      type: String,
      required: [true, "Comment cannot be empty"],
      trim: true,
      maxlength: [5000, "Comment cannot exceed 5000 characters"],
    },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

commentSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Comment", commentSchema);
