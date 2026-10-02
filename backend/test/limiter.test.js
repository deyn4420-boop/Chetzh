import assert from "node:assert/strict";
import test from "node:test";
import { createRateLimiter } from "../middleware/limiter.js";

const createClient = () => {
  const counts = new Map();
  return {
    async incr(key) {
      const count = (counts.get(key) || 0) + 1;
      counts.set(key, count);
      return count;
    },
    async expire() {},
  };
};

const runLimiter = async (limiter, request) => {
  const response = {
    headers: {},
    set(name, value) { this.headers[name] = value; },
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  let continued = false;
  await limiter(request, response, () => { continued = true; });
  return { continued, response };
};

test("limits requests after the configured fixed-window maximum", async () => {
  const limiter = createRateLimiter({
    client: createClient(),
    keyPrefix: "test",
    keyGenerator: (req) => req.ip,
    maxRequests: 2,
  });
  const request = { ip: "203.0.113.10" };
  assert.equal((await runLimiter(limiter, request)).continued, true);
  assert.equal((await runLimiter(limiter, request)).continued, true);
  const blocked = await runLimiter(limiter, request);
  assert.equal(blocked.continued, false);
  assert.equal(blocked.response.statusCode, 429);
  assert.deepEqual(blocked.response.payload, {
    message: "Too many requests, please try again later.",
  });
});

test("uses the IP address when a request has no body", async () => {
  const limiter = createRateLimiter({
    client: createClient(),
    keyPrefix: "test",
    keyGenerator: (req) => req.body?.userId || req.ip,
    maxRequests: 1,
  });
  const request = { ip: "203.0.113.11" };
  assert.equal((await runLimiter(limiter, request)).continued, true);
  assert.equal((await runLimiter(limiter, request)).response.statusCode, 429);
});
