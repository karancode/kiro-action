import * as core from "@actions/core";
import * as cache from "@actions/cache";
import * as exec from "@actions/exec";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

const KIRO_BIN_DIR = path.join(os.homedir(), ".local", "bin");
const MANIFEST_URL = "https://prod.download.cli.kiro.dev/stable/latest/manifest.json";

async function resolveInstalledVersion(): Promise<string> {
  const response = await fetch(MANIFEST_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Kiro CLI manifest: ${response.status} ${response.statusText}`);
  }
  const manifest = (await response.json()) as { version?: string };
  if (!manifest.version) throw new Error("Kiro CLI manifest did not include a version field");
  return manifest.version;
}

export async function installKiro(): Promise<void> {
  const version = await resolveInstalledVersion();
  const cacheKey = `kiro-cli-${version}-${process.platform}-${process.arch}`;
  const binaryPath = path.join(KIRO_BIN_DIR, "kiro-cli");

  // Restore from actions cache if available
  const cacheHit = await cache.restoreCache([KIRO_BIN_DIR], cacheKey);
  if (cacheHit && fs.existsSync(binaryPath)) {
    core.addPath(KIRO_BIN_DIR);
    core.info(`Kiro CLI ${version} restored from actions cache.`);
    return;
  }

  // Install via the official install script — handles platform/arch/musl detection
  core.info(`Installing Kiro CLI ${version} via official install script...`);
  await exec.exec("bash", ["-c", "curl -fsSL https://cli.kiro.dev/install | bash"], {
    env: {
      ...process.env,
      // Skip the interactive setup wizard that runs post-install
      KIRO_CLI_SKIP_SETUP: "1",
    },
  });

  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Kiro CLI installation failed: binary not found at ${binaryPath}`);
  }

  core.addPath(KIRO_BIN_DIR);
  core.info(`Kiro CLI ${version} installed successfully.`);

  // Cache for future runs
  await cache.saveCache([KIRO_BIN_DIR], cacheKey);
}
