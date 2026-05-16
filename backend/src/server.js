const app = require("./app");
const http = require("http");
const prisma = require("./prisma/client");

const requiredEnv = ["DATABASE_URL", "JWT_SECRET"];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`Missing required environment variables: ${missingEnv.join(", ")}`);
  process.exit(1);
}

const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");

const server = http.createServer(app);

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

server.on("listening", () => {
  const address = server.address();
  const boundTo = typeof address === "string" ? address : `${address.address}:${address.port}`;
  console.log(`API server listening at http://${boundTo}`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the existing service or set PORT to another value.`);
  } else if (error.code === "EACCES" || error.code === "EPERM") {
    console.error(`Permission denied while binding ${host}:${port}.`);
  } else {
    console.error("Failed to start API server:", error);
  }

  process.exit(1);
});

server.listen(port, host);

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

module.exports = server;
