import { z } from "zod";
import { Types } from "mongoose";

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid id");

export const createBoardSchema = z.object({
  body: z.object({
    workspaceId: objectId,
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    description: z.string().trim().max(500).optional(),
    // Optional custom column names; falls back to DEFAULT_COLUMNS if omitted.
    columns: z.array(z.string().trim().min(1).max(60)).min(1).max(20).optional(),
  }),
});

export const updateBoardSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).optional(),
  }),
});

export const addColumnSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1).max(60),
  }),
});
