import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function syncNextServerChunks(projectRoot = process.cwd()) {
  const serverDir = path.join(projectRoot, ".next", "server");
  const chunksDir = path.join(serverDir, "chunks");

  if (!(await pathExists(chunksDir))) {
    return { copied: 0, skipped: true };
  }

  await mkdir(serverDir, { recursive: true });

  const entries = await readdir(chunksDir, { withFileTypes: true });
  let copied = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue;
    }

    const sourcePath = path.join(chunksDir, entry.name);
    const destinationPath = path.join(serverDir, entry.name);

    await copyFile(sourcePath, destinationPath);
    copied += 1;
  }

  return { copied, skipped: false };
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  try {
    const result = await syncNextServerChunks();

    if (!result.skipped && result.copied > 0) {
      console.info(`Synced ${result.copied} Next server chunk(s).`);
    }
  } catch (error) {
    console.error("Unable to sync Next server chunks.", error);
    process.exitCode = 1;
  }
}
