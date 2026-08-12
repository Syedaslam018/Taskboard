import { z } from "zod";

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string().trim().min(1, "Comment cannot be empty").max(3000),
  }),
});

export const updateCommentSchema = createCommentSchema;
