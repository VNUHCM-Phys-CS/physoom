import { Schema, model, models } from "mongoose";

const viewShareSchema = new Schema(
  {
    title: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    shortCode: { type: String, unique: true, sparse: true, maxlength: 6 },
    rooms: [{ type: Schema.Types.ObjectId, ref: "Room" }],
    classes: [{ type: String }], // class_id list — share a class's whole timetable
    settings: {
        requireLogin: { type: Boolean, default: false },
        displayTeacherInfo: { type: Boolean, default: true },
        displayClassInfo: { type: Boolean, default: true },
        displayEventDetail: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);

const ViewShare = models.ViewShare || model("ViewShare", viewShareSchema);

export default ViewShare;
