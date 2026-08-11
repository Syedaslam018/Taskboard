import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env";
import authRoutes from "./routes/auth.routes";
import workspaceRoutes from "./routes/workspace.routes";
import boardRoutes from "./routes/board.routes";
import taskRoutes from "./routes/task.routes";
// Phase 7+: import notificationRoutes from "./routes/notification.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  if (!env.isProduction) {
    app.use(morgan("dev"));
  }

  app.get("/api/health", (_req, res) => {
    res.status(200).json({ success: true, data: { status: "ok" }, message: "Server is healthy" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/workspaces", workspaceRoutes);
  app.use("/api/boards", boardRoutes);
  app.use("/api/tasks", taskRoutes);
  // Phase 7+: app.use("/api/notifications", notificationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
