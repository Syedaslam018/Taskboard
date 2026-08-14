import http from "http";
import { createApp } from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { initSocket } from "./sockets";

async function bootstrap(): Promise<void> {
  await connectDB();

  const app = createApp();
  const server = http.createServer(app);

  initSocket(server);

  server.listen(env.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] listening on port ${env.port} (${env.nodeEnv})`);
  });

  process.on("unhandledRejection", (reason) => {
    // eslint-disable-next-line no-console
    console.error("[unhandledRejection]", reason);
    server.close(() => process.exit(1));
  });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[bootstrap] failed to start server:", err);
  process.exit(1);
});
