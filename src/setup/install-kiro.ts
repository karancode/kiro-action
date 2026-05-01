import * as core from "@actions/core";
import * as cache from "@actions/cache";
import * as tc from "@actions/tool-cache";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// Known SHA256 checksums for pinned versions.
// Add entries here when bumping the default version.
const CHECKSUMS: Record<string, Record<string, string>> = {
  "2.0.0": {
    "linux-x64": "", // populate once binary is available
    "linux-arm64": "",
    "darwin-x64": "",
    "darwin-arm64": "",
  },
};

function getPlatformKey(): string {
  const platform = process.platform === "darwin" ? "darwin" : "linux";
  const arch = process.arch === "arm64" ? "arm64" : "x64";
  return `${platform}-${arch}`;
}

function getBinaryName(platformKey: string): string {
  const names: Record<string, string> = {
    "linux-x64": "kiro-linux-x64",
    "linux-arm64": "kiro-linux-arm64",
    "darwin-x64": "kiro-macos-x64",
    "darwin-arm64": "kiro-macos-arm64",
  };
  const name = names[platformKey];
  if (!name) throw new Error(`Unsupported platform: ${platformKey}`);
  return name;
}

function getDownloadUrl(version: string, binaryName: string): string {
  return `https://github.com/kirodotdev/kiro/releases/download/v${version}/${binaryName}`;
}

async function verifyChecksum(filePath: string, expected: string): Promise<void> {
  if (!expected) {
    core.warning("No checksum available for this version/platform — skipping verification.");
    return;
  }
  const data = fs.readFileSync(filePath);
  const actual = crypto.createHash("sha256").update(data).digest("hex");
  if (actual !== expected) {
    throw new Error(`Checksum mismatch for Kiro CLI binary.\nExpected: ${expected}\nActual:   ${actual}`);
  }
  core.debug(`Checksum verified: ${actual}`);
}

export async function installKiro(version: string): Promise<void> {
  const platformKey = getPlatformKey();
  const binaryName = getBinaryName(platformKey);
  const cacheKey = `kiro-cli-${version}-${platformKey}`;
  const installDir = path.join(process.env["RUNNER_TOOL_CACHE"] ?? "/tmp", "kiro", version, platformKey);
  const binaryPath = path.join(installDir, "kiro");

  // Check tool cache first
  const cached = tc.find("kiro", version, platformKey);
  if (cached) {
    core.addPath(cached);
    core.info(`Kiro CLI ${version} loaded from tool cache.`);
    return;
  }

  // Check actions cache
  const cacheHit = await cache.restoreCache([installDir], cacheKey);
  if (cacheHit && fs.existsSync(binaryPath)) {
    core.addPath(installDir);
    core.info(`Kiro CLI ${version} restored from actions cache.`);
    return;
  }

  // Download
  const downloadUrl = getDownloadUrl(version, binaryName);
  core.info(`Downloading Kiro CLI ${version} from ${downloadUrl}`);
  const downloadedPath = await tc.downloadTool(downloadUrl);

  // Verify checksum
  const expectedChecksum = CHECKSUMS[version]?.[platformKey] ?? "";
  await verifyChecksum(downloadedPath, expectedChecksum);

  // Install
  fs.mkdirSync(installDir, { recursive: true });
  fs.copyFileSync(downloadedPath, binaryPath);
  fs.chmodSync(binaryPath, 0o755);

  // Save to actions cache for future runs
  await cache.saveCache([installDir], cacheKey);

  core.addPath(installDir);
  core.info(`Kiro CLI ${version} installed successfully.`);
}
