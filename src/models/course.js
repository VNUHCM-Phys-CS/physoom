import mongoose, { Schema } from "mongoose";
import { locationList } from "@/models/ulti";
const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    teacher_email: {
      type: [String],
      required: true,
    },
    course_id:{
      type: String
    },
    class_id:{
      type: String
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
  },
  { timestamps: true }
);
courseSchema.index({ title: 1, course_id: 1, class_id: 1 }, { unique: true })
courseSchema.index({ class_id: 'text' })
export default mongoose.models?.Course ||
  mongoose.model("Course", courseSchema);
