import { z } from "zod";

export const criteriaSchema = z.object({
  cid: z
    .string({
      required_error: "required field",
    }),
  quote: z.string(),
  selection: z.array(z.object({text:z.string()})),
});

export const listSchema = z.object({
  title: z
    .string({
      required_error: "required field"
    }),
  presenDate: z.date({
    required_error: "Please select a date",
    invalid_type_error: "That's not a date!",
  }),
  durationEach: z
    .number({
      required_error: "required field",
    })
    .min(0.1),
  criteria: z.array(criteriaSchema),
});
//   .refine((data) => data.password === data.confirmPassword, {
//     message: "Passwords do not match",
//     path: ["confirmPassword"], // path of error
//   });
