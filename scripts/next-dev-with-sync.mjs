import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { syncNextServerChunks } from "./sync-next-server-chunks.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const nextBinary = process.platform === "win32"
  ? path.join(projectRoot, "node_modules", ".bin", "next.cmd")
  : path.join(projectRoot, "node_modules", ".bin", "next");

const syncChunks = async () => {
  try {
    await syncNextServerChunks(projectRoot);
  } catch {
    // Keep the dev server alive even if the chunk mirror is briefly unavailable.
  }
};

await syncChunks();

const child = spawn(nextBinary, ["dev"], {
  cwd: projectRoot,
  stdio: "inherit",
  shell: false,
});

const interval = setInterval(() => {
  void syncChunks();
}, 1000);

const stop = (signal) => {
  clearInterval(interval);

  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

child.on("exit", (code, signal) => {
  clearInterval(interval);

  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
