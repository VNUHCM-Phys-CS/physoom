import mongoose, { Schema } from "mongoose";

const viewpermissionSchema = new Schema({
  code: {
    type: String,
    required: true,
    unique: true,
  },
  class_id: {
    type: String,
  },
});
viewpermissionSchema.index({ code: 1 }, { unique: true });

const Viewpermission = mongoose.models?.Viewpermission || mongoose.model("Viewpermission", viewpermissionSchema);

export default Viewpermission;
