import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;

  console.error(`❌ [${statusCode}] ${err.message}`);
  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  const isProduction = process.env.NODE_ENV === "production";
  res.status(statusCode).json({
    error: isProduction ? "An internal error occurred" : err.message,
    ...(!isProduction && { stack: err.stack }),
  });
};
