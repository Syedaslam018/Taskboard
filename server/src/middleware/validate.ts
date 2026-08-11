import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodError } from "zod";
import { AppError } from "../utils/AppError";

/**
 * Validates req.{body,query,params} against a Zod schema shaped as
 * { body?, query?, params? }. Replaces req.body with the parsed (and
 * coerced/trimmed) value so downstream code can trust it.
 */
export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body ?? req.body;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors.map((e) => e.message).join(", ");
        next(AppError.badRequest(message));
        return;
      }
      next(err);
    }
  };
}
