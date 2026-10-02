import Redis from "ioredis";

const port = Number.parseInt(process.env.REDIS_PORT || "6379", 10);

const redisClient = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number.isNaN(port) ? 6379 : port,
});

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

redisClient.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

export default redisClient;
