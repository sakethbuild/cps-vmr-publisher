import path from "node:path";

export function getEnv() {
  return {
    databaseUrl: process.env.DATABASE_URL ?? "file:./dev.db",
    storageRoot: path.resolve(process.cwd(), process.env.STORAGE_ROOT ?? "./storage"),
    wordpressMode: process.env.WORDPRESS_MODE ?? "mock",
    wordpressBaseUrl: process.env.WORDPRESS_BASE_URL ?? "",
    wordpressUsername: process.env.WORDPRESS_USERNAME ?? "",
    wordpressApplicationPassword:
      process.env.WORDPRESS_APPLICATION_PASSWORD ?? "",
  };
}
