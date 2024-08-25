import mongoose, { Schema } from "mongoose";

const BookingSchema = new Schema({
  teacher_email: {
    type: String,
    required: true,
  },
  room: {
    type: Schema.Types.ObjectId,
    ref: "Room",
    required: true,
  },
  course: {
    type: Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  time_slot: {
    weekday: {
      type: Number,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    start_time: {
      type: Number,
    },
    end_time: {
      type: Number,
    },
    start_date: {
      type: Date,
    },
    end_date: {
      type: Date,
    },
  },
  isConfirm: {
    type: Boolean,
  },
});

const Booking =
  mongoose.models?.Booking || mongoose.model("Booking", BookingSchema);

export default Booking;
