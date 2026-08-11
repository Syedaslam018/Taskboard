import dotenv from "dotenv";
dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: required("NODE_ENV", "development"),
  port: Number(required("PORT", "5000")),
  mongoUri: required("MONGO_URI", "mongodb://localhost:27017/taskboard"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET", "dev_access_secret"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET", "dev_refresh_secret"),
  jwtAccessExpiresIn: required("JWT_ACCESS_EXPIRES_IN", "15m"),
  jwtRefreshExpiresIn: required("JWT_REFRESH_EXPIRES_IN", "7d"),
  clientUrl: required("CLIENT_URL", "http://localhost:5173"),
  cookieSecure: (process.env.COOKIE_SECURE ?? "false") === "true",
  isProduction: (process.env.NODE_ENV ?? "development") === "production",
};
