import Fastify from "fastify";
import cors from "@fastify/cors";
import { config } from "./config.js";
import meRoutes from "./routes/me.js";
import courseRoutes from "./routes/courses.js";
import streamUrlRoutes from "./routes/streamUrl.js";
import progressRoutes from "./routes/progress.js";
import adminRoutes from "./routes/admin.js";

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(meRoutes, { prefix: "/api" });
  await app.register(courseRoutes, { prefix: "/api" });
  await app.register(streamUrlRoutes, { prefix: "/api" });
  await app.register(progressRoutes, { prefix: "/api" });
  await app.register(adminRoutes, { prefix: "/api" });

  app.get("/health", async () => ({ ok: true }));

  const port = config.port;
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`API listening on http://localhost:${port}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
