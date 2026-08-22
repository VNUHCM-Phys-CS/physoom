import mongoose, { Schema } from "mongoose";

// A REGISTRY entry for an API key / secret used by one of the apps. This is an
// INVENTORY only — it deliberately stores NO secret value. The real secret stays
// in each app's env / secret manager; here we track what exists so keys don't get
// lost across many apps, and we can plan rotation. `last4` is just the last few
// characters (typed by the admin) for identification — never the full secret.
const apiKeyEntrySchema = new Schema(
  {
    app: { type: String, required: true, trim: true }, // e.g. physoom, offisoom, geolisten
    name: { type: String, required: true, trim: true }, // env var / key name, e.g. NEXT_GOOGLE_SECRET
    provider: { type: String, default: "", trim: true }, // Google, Vercel, MongoDB, VAPID, ...
    environment: { type: String, default: "production" }, // production | preview | development | all
    location: { type: String, default: "", trim: true }, // where it lives: "Vercel env — physoom", ".env.local"
    owner: { type: String, default: "", trim: true }, // responsible person (email)
    last4: { type: String, default: "", trim: true }, // last few chars for ID only — NOT the secret
    status: { type: String, enum: ["active", "revoked", "expired"], default: "active" },
    rotateEveryDays: { type: Number, default: 0 }, // 0 = no rotation policy
    lastRotatedAt: { type: Date },
    notes: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

apiKeyEntrySchema.index({ app: 1, name: 1 });

if (process.env.NODE_ENV === "development") {
  delete mongoose.models.ApiKeyEntry;
}

export default mongoose.models?.ApiKeyEntry || mongoose.model("ApiKeyEntry", apiKeyEntrySchema);
