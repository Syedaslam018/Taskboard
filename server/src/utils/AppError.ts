export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string): AppError {
    return new AppError(message, 400);
  }
  static unauthorized(message = "Not authenticated"): AppError {
    return new AppError(message, 401);
  }
  static forbidden(message = "You do not have permission to perform this action"): AppError {
    return new AppError(message, 403);
  }
  static notFound(message = "Resource not found"): AppError {
    return new AppError(message, 404);
  }
  static conflict(message: string): AppError {
    return new AppError(message, 409);
  }
}
