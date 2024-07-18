import mongoose, { Schema } from "mongoose";
import {locationList} from "util";
const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    teacher_email: {
      type: String,
      required: true,
    },
    population: {
      type: Number,
      validate : {
        validator : Number.isInteger,
        message   : '{VALUE} is not an integer value'
      }
    },
    start_date: {
      type: Date,
      required: true,
    },
    credit: {
      type: Number,
      required: true,
      validate : {
        validator : Number.isInteger,
        message   : '{VALUE} is not an integer value'
      }
    },
    duration: {
      type: Number,
      required: true,
      validate : {
        validator : Number.isInteger,
        message   : '{VALUE} is not an integer value'
      }
    },
    location: {
      type: String,
      enum: locationList.short
    },
  },
  { timestamps: true }
);

export default mongoose.models?.Course || mongoose.model("Course", courseSchema);
