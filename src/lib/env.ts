import path from "node:path";

export function getEnv() {
  return {
    databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
    storageRoot: path.resolve(process.cwd(), process.env.STORAGE_ROOT ?? "./storage"),
    appBaseUrl: (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(
      /\/+$/,
      "",
    ),
  };
}
