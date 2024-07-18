import { z } from "zod";
export const presentationSchema = z.object({
    name: z.string(),
    order: z.number(),
    member: z.array(z.object({
        name: z.string(),
        sid: z.string()
    })),
    thumbnail: z.string().optional(),
    projectLink: z.string().optional(),
    video: z.string().optional(),
    slide: z.string().optional(),
    report: z.string().optional(),
    note: z.string().optional(),
});
export const teamListSchema = z.object({presentation:z.array(presentationSchema)});

