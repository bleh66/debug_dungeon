import app from "./app.js";
import { assertProductionConfiguration, getPort } from "./config/runtime.js";

assertProductionConfiguration();
const PORT = getPort();

const server = app.listen(PORT, () => {
  console.log(`Debug Dungeon backend listening on port ${PORT}`);
});

const shutdown = (signal: string) => {
  console.log(`Received ${signal}; shutting down`);
  server.close(() => process.exit(0));
};

process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));