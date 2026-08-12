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
});
userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.models?.User || mongoose.model("User", userSchema);

export default User;
