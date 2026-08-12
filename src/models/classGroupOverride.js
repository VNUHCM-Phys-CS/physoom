import { Schema, model, models } from "mongoose";

// Manual class-grouping override. By default classes are grouped by the naming
// rule in @/lib/classGroup (…_A/_B/_C sub-sections merge into their base). An
// admin can override that here: force a class into a specific group (merge), or
// give it its own group key (split). `group` is the target group key.
const classGroupOverrideSchema = new Schema(
  {
    classId: { type: String, required: true, unique: true },
    group: { type: String, required: true },
    note: { type: String },
  },
  { timestamps: true }
);

const ClassGroupOverride =
  models.ClassGroupOverride || model("ClassGroupOverride", classGroupOverrideSchema);

export default ClassGroupOverride;
