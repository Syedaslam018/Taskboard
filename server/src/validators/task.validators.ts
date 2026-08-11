import { z } from "zod";
import { Types } from "mongoose";
import { TaskPriority } from "../models/Task";

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), "Invalid id");

export const createTaskSchema = z.object({
  body: z.object({
    columnId: objectId,
    title: z.string().trim().min(1, "Title is required").max(200),
    description: z.string().trim().max(5000).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assignee: objectId.optional(),
    labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    dueDate: z.string().datetime().optional(),
  }),
});

export const updateTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    assignee: objectId.nullable().optional(),
    labels: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
    dueDate: z.string().datetime().nullable().optional(),
  }),
});

export const moveTaskSchema = z.object({
  body: z.object({
    columnId: objectId,
    position: z.number().int().min(0),
  }),
});

export const listTasksQuerySchema = z.object({
  query: z.object({
    assignee: objectId.optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    columnId: objectId.optional(),
    label: z.string().trim().min(1).optional(),
    search: z.string().trim().min(1).max(200).optional(),
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
  }),
});
