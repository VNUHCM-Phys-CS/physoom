import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema({
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
      required: true,
      validate : {
        validator : Number.isInteger,
        message   : '{VALUE} is not an integer value'
      }
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
  },
  isConfirm: {
    type: Boolean
  }
});

const booking =
  mongoose.models?.Booking ||
  mongoose.model("booking", bookingSchema);

export default booking;
