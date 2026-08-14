import mongoose from "mongoose";
import User from "../models/User.js";

/**
 * Assignment activity stores user ids in `from`/`to`. Swap them for display names
 * so the client never has to render a raw ObjectId.
 */
export async function withResolvedNames(entries) {
  const plain = entries.map((entry) => (entry.toJSON ? entry.toJSON() : { ...entry }));

  const ids = plain.flatMap((a) =>
    a.field === "assignee" ? [a.from, a.to].filter((v) => v && mongoose.isValidObjectId(v)) : []
  );
  if (!ids.length) return plain;

  const users = await User.find({ _id: { $in: ids } }).select("name");
  const nameById = new Map(users.map((u) => [String(u._id), u.name]));

  return plain.map((item) => {
    if (item.field !== "assignee") return item;
    return {
      ...item,
      from: item.from ? nameById.get(item.from) || "Unknown user" : null,
      to: item.to ? nameById.get(item.to) || "Unknown user" : null,
    };
  });
}
