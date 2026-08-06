import mongoose, { Schema } from "mongoose";

// A learned mapping from a (normalised/diacritic-stripped) teacher name to a
// specific user email. Used to resolve ambiguous name matches during import
// without asking again next time.
const TeacherAliasSchema = new Schema(
  {
    key: { type: String, required: true, unique: true }, // stripped name
    email: { type: String, required: true },
    name: { type: String }, // original display name for reference
  },
  { timestamps: true }
);

export default mongoose.models.TeacherAlias ||
  mongoose.model("TeacherAlias", TeacherAliasSchema);
