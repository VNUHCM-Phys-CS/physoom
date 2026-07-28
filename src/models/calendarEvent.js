import mongoose, { Schema } from "mongoose";

const CalendarEventSchema = new Schema({
  title: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['class', 'holiday', 'term', 'exam', 'personal', 'custom', 'other'], 
    default: 'class' 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'approved'
  },
  tags: [String],
  start: { type: Date, required: true },
  end: { type: Date, required: true },
  course: { type: Schema.Types.ObjectId, ref: "Course" },
  room: { type: Schema.Types.ObjectId, ref: "Room" },
  booking_id: { type: Schema.Types.ObjectId, ref: "Booking" },
  teacher_email: [String],
  host: [String],
  attendees: [String],
  series_id: { type: String },
  original_start: Date,
  isCancelled: { type: Boolean, default: false },

  // Grid-specific fields for CalendarByRoom grid (derived at creation time)
  weekday: { type: Number }, // 2=Mon, 3=Tue ... 7=Sat, 8=Sun
  location: { type: String }, // "NVC" | "LT" or other campus
  time_slot: {
    start_time: { type: Number }, // minutes from midnight (e.g. 450 = 7:30)
    end_time: { type: Number },   // minutes from midnight
  }
}, { timestamps: true });

// Fast grid queries by room or teacher across time
CalendarEventSchema.index({ room: 1, start: 1, end: 1 });
CalendarEventSchema.index({ teacher_email: 1, start: 1, end: 1 });
CalendarEventSchema.index({ series_id: 1 });
CalendarEventSchema.index({ weekday: 1, room: 1 });

// In dev, delete cached model so schema changes take effect without restarting
if (process.env.NODE_ENV === "development") {
  delete mongoose.models.CalendarEvent;
}

export default mongoose.model("CalendarEvent", CalendarEventSchema);
