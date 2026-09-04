import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    max: 50,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  // Full-access admin. A plain isAdmin with a non-empty adminScope is a SCOPED
  // admin who may only manage classes matching one of their scope patterns.
  isSuperAdmin: {
    type: Boolean,
    default: false,
  },
  // Class-code patterns a scoped admin manages, e.g. ["CVD"] matches 24CVD,
  // 24CVD_DKD, 25CVD… Substring match, case-insensitive, "-" treated as "_".
  adminScope: {
    type: [String],
    default: [],
  },
  teacher_id: {
    type: String,
  },
  name: {
    type: String,
  },
  department: {
    type: String, // bộ môn / đơn vị
  },
  rank: {
    type: String, // ngạch (VD: GV, GVC, GVCC)
  },
  degree: {
    type: String, // học vị (VD: GS, PGS, TS, ThS, CN)
  },
  // Google Calendar link (OAuth). refreshToken lets Physoom push the user's
  // schedule into a dedicated "Physoom" calendar in their Google account.
  google: {
    refreshToken: { type: String },
    calendarId: { type: String },
    connectedAt: { type: Date },
  },
});
// Chỉ số duy nhất cho email đã khai ở field (`unique: true`) — KHÔNG khai lại
// bằng schema.index() nữa, nếu không Mongoose cảnh báo "Duplicate schema index".

const User = mongoose.models?.User || mongoose.model("User", userSchema);

export default User;
