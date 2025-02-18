import mongoose, { Schema } from "mongoose";
import { locationList } from "@/models/ulti";
const courseSchema = new Schema(
  {
    title: {
      type: String,
    },
    teacher_email: {
      type: [String],
      required: true,
    },
    course_id: {
      type: String,
      required: true,
    },
    course_id_extend: {
      type: String,
    },
    class_id: {
      type: [String],
      required: [true, "Class ID is required"],
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length > 0;
        },
        message: "Class ID must be an array with at least one element",
      },
    },
    population: {
      type: Number,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    start_date: {
      type: Date,
      required: true,
    },
    credit: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    duration: {
      type: Number,
      required: true,
      validate: {
        validator: Number.isInteger,
        message: "{VALUE} is not an integer value",
      },
    },
    category: [
      {
        type: String,
        enum: locationList.short,
      },
    ],
    location: {
      type: String,
      enum: locationList.short,
    },
    isLock: {
      type: Boolean,
    },
  },
  { timestamps: true }
);
courseSchema.index(
  { course_id: 1, course_id_extend: 1, class_id: 1 },
  { unique: true }
);
courseSchema.index({ class_id: "text" });
export default mongoose.models?.Course ||
  mongoose.model("Course", courseSchema);
