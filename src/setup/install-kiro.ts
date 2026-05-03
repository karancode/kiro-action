import * as core from "@actions/core";
import * as cache from "@actions/cache";
import * as exec from "@actions/exec";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const MANIFEST_URL = "https://prod.download.cli.kiro.dev/stable/latest/manifest.json";
const KIRO_BIN_DIR = path.join(os.homedir(), ".local", "bin");
const KIRO_BINARY = path.join(KIRO_BIN_DIR, "kiro-cli");

async function resolveLatestVersion(): Promise<string> {
  // Manifest is publicly readable (200) even though binary CDN returns 403.
  // We use it only to get the current version string for cache keying.
  const response = await fetch(MANIFEST_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Kiro CLI manifest: ${response.status} ${response.statusText}`);
  }
  const manifest = (await response.json()) as { version?: string };
  if (!manifest.version) throw new Error("Kiro CLI manifest did not include a version field");
  return manifest.version;
}

export async function installKiro(): Promise<void> {
  const version = await resolveLatestVersion();
  const cacheKey = `kiro-cli-${version}-${process.platform}-${process.arch}`;

  const cacheHit = await cache.restoreCache([KIRO_BIN_DIR], cacheKey);
  if (cacheHit && fs.existsSync(KIRO_BINARY)) {
    core.addPath(KIRO_BIN_DIR);
    core.info(`Kiro CLI ${version} restored from cache.`);
    return;
  }

  // The binary CDN (prod.download.cli.kiro.dev) is not publicly accessible —
  // the official install script is the only supported download path.
  core.info(`Installing Kiro CLI ${version} via official install script...`);
  await exec.exec("bash", ["-c", "curl -fsSL https://cli.kiro.dev/install | bash"], {
    env: {
      ...process.env,
      KIRO_CLI_SKIP_SETUP: "1",
    },
  });

  if (!fs.existsSync(KIRO_BINARY)) {
    throw new Error(`Kiro CLI installation failed: binary not found at ${KIRO_BINARY}`);
  }

  core.addPath(KIRO_BIN_DIR);
  core.info(`Kiro CLI ${version} installed successfully.`);

  await cache.saveCache([KIRO_BIN_DIR], cacheKey);
}
