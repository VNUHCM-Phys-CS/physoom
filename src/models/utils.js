import { z } from "zod";
export const courseSchema = z.object({
  title: z.string().nonempty("Title is required"),
  teacher_email: z.array(z.string().email("Invalid email address")).nonempty(),
  course_id: z.string().optional(),
  class_id: z.string().optional(),
  population: z.number().int("Population must be an integer"),
  start_date: z.string().nonempty("Start date is required"),
  credit: z.number().int("Credit must be an integer"),
  duration: z.number().int("Duration must be an integer"),
  location: z.string().nonempty("Location is required"),
  isLock: z.boolean().optional(),
});

export const roomSchema = z.object({
  title: z.string().nonempty("Title is required"),
  limit: z.number().int("Limit must be an integer"),
  location: z.string().nonempty("Location is required"),
  category: z.array(z.string().nonempty("Category is required")),
  note: z.string().optional(),
});
