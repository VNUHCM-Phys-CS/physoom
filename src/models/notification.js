import mongoose, { Schema } from "mongoose";

const NotificationSchema = new Schema(
  {
    recipient: { type: String, required: true, index: true }, // user email
    type: { type: String, default: "info" }, // info | approval | approved | rejected
    title: { type: String, required: true },
    message: { type: String, default: "" },
    link: { type: String, default: "" }, // in-app path to open
    read: { type: Boolean, default: false },
    event: { type: Schema.Types.ObjectId, ref: "CalendarEvent" },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

if (process.env.NODE_ENV === "development") {
  delete mongoose.models.Notification;
}

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
