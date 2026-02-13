import request from "supertest";
import app from "../server";

describe("GET /health", () => {
  it("returns 200 with correct shape", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      status: "ok",
      service: "inboxiq-backend",
    });
    expect(res.body.timestamp).toBeDefined();
    expect(() => new Date(res.body.timestamp)).not.toThrow();
  });
});
