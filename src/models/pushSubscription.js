import mongoose, { Schema } from "mongoose";

const PushSubscriptionSchema = new Schema(
  {
    recipient: { type: String, required: true, index: true }, // user email
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: String,
      auth: String,
    },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV === "development") {
  delete mongoose.models.PushSubscription;
}

export default mongoose.models.PushSubscription ||
  mongoose.model("PushSubscription", PushSubscriptionSchema);
