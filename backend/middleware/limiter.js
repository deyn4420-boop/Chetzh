const WINDOW_SECONDS = 15 * 60;
const MAX_REQUESTS = 1000;

const getIpAddress = (req) => req.ip || req.socket?.remoteAddress || "unknown";

/** Creates a Redis-backed fixed-window rate limiter. */
export const createRateLimiter = ({
  client,
  keyPrefix,
  keyGenerator,
  windowSeconds = WINDOW_SECONDS,
  maxRequests = MAX_REQUESTS,
}) => async (req, res, next) => {
  try {
    if (!client) {
      throw new Error("A Redis client is required for rate limiting");
    }

    const identity = keyGenerator(req);
    const key = `${keyPrefix}:${identity}`;
    const requestCount = await client.incr(key);

    if (requestCount === 1) {
      await client.expire(key, windowSeconds);
    }

    res.set("RateLimit-Limit", String(maxRequests));
    res.set("RateLimit-Remaining", String(Math.max(maxRequests - requestCount, 0)));

    if (requestCount > maxRequests) {
      return res.status(429).json({
        message: "Too many requests, please try again later.",
      });
    }

    return next();
  } catch (error) {
    console.error("Rate limiting error:", error.message);
    return next();
  }
};

// Global guard: one counter per client IP address.
export const createUserLimiter = (client) => createRateLimiter({
  client,
  keyPrefix: "rate_limit:ip",
  keyGenerator: getIpAddress,
});

// A signed-in user receives an independent counter. Anonymous traffic falls
// back to the client IP. Optional chaining also keeps GET requests safe.
export const createLocalLimiter = (client) => createRateLimiter({
  client,
  keyPrefix: "rate_limit:user",
  keyGenerator: (req) => req.body?.userId || getIpAddress(req),
});
