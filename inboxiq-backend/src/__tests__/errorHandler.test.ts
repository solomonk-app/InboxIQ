import { AppError, errorHandler } from "../middleware/errorHandler";
import { Request, Response, NextFunction } from "express";

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("AppError", () => {
  it("defaults to 500", () => {
    const err = new AppError("fail");
    expect(err.statusCode).toBe(500);
    expect(err.message).toBe("fail");
    expect(err.name).toBe("AppError");
  });

  it("accepts a custom status code", () => {
    const err = new AppError("not found", 404);
    expect(err.statusCode).toBe(404);
  });
});

describe("errorHandler", () => {
  const req = {} as Request;
  const next = jest.fn() as NextFunction;

  it("returns the AppError status code and message in dev", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const res = mockRes();
      errorHandler(new AppError("bad request", 400), req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "bad request" })
      );
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it("returns generic message in production", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const res = mockRes();
      errorHandler(new AppError("secret details", 500), req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "An internal error occurred" });
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it("defaults to 500 for plain Error", () => {
    const res = mockRes();
    errorHandler(new Error("oops"), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
