import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const MANIFEST_URL = "https://prod.download.cli.kiro.dev/stable/latest/manifest.json";
const MANIFEST_BASE_URL = "https://prod.download.cli.kiro.dev/stable/latest";

interface KiroPackage {
  os: string;
  architecture: string;
  variant: string;
  fileType: string;
  download: string;
  sha256: string;
}

interface KiroManifest {
  version: string;
  packages: KiroPackage[];
}

function getCurrentPlatform(): { os: string; arch: string } {
  const os = process.platform === "darwin" ? "macos" : "linux";
  const arch = process.arch === "arm64" ? "aarch64" : "x86_64";
  return { os, arch };
}

async function fetchManifest(): Promise<KiroManifest> {
  const response = await fetch(MANIFEST_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Kiro CLI manifest: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<KiroManifest>;
}

function selectPackage(manifest: KiroManifest, os: string, arch: string): KiroPackage {
  // Prefer the headless variant for CI — falls back to full if headless not available
  const headless = manifest.packages.find(
    (p) => p.os === os && p.architecture === arch && p.variant === "headless"
  );
  const full = manifest.packages.find(
    (p) => p.os === os && p.architecture === arch && p.variant === "full"
  );
  const pkg = headless ?? full;
  if (!pkg) {
    throw new Error(`No Kiro CLI package found for ${os}/${arch}`);
  }
  return pkg;
}

async function verifyChecksum(filePath: string, expected: string): Promise<void> {
  const data = fs.readFileSync(filePath);
  const actual = crypto.createHash("sha256").update(data).digest("hex");
  if (actual !== expected) {
    throw new Error(
      `Kiro CLI checksum mismatch.\nExpected: ${expected}\nActual:   ${actual}`
    );
  }
  core.debug(`SHA256 verified: ${actual}`);
}

export async function installKiro(): Promise<void> {
  const { os, arch } = getCurrentPlatform();

  core.info("Fetching Kiro CLI manifest...");
  const manifest = await fetchManifest();
  const version = manifest.version;

  // Check tool cache first (fastest path — no network needed after first install)
  const cached = tc.find("kiro-cli", version, arch);
  if (cached) {
    core.addPath(cached);
    core.info(`Kiro CLI ${version} loaded from tool cache.`);
    return;
  }

  const pkg = selectPackage(manifest, os, arch);
  const downloadUrl = `${MANIFEST_BASE_URL}/${pkg.download}`;

  core.info(`Installing Kiro CLI ${version} (${os}/${arch})...`);
  core.debug(`Download URL: ${downloadUrl}`);

  const downloadedPath = await tc.downloadTool(downloadUrl);
  await verifyChecksum(downloadedPath, pkg.sha256);
  core.info("SHA256 checksum verified.");

  // Extract — handle both tar.xz / tar.gz / zip
  let extractedDir: string;
  if (pkg.fileType === "tarXz" || pkg.fileType === "tarGz" || pkg.fileType === "tarZst") {
    extractedDir = await tc.extractTar(downloadedPath, undefined, ["x"]);
  } else if (pkg.fileType === "zip") {
    extractedDir = await tc.extractZip(downloadedPath);
  } else {
    throw new Error(`Unsupported file type: ${pkg.fileType}`);
  }

  // Find the kiro-cli binary inside the extracted directory
  const binaryPath = findBinary(extractedDir, "kiro-cli");
  if (!binaryPath) {
    throw new Error(`kiro-cli binary not found in extracted archive at ${extractedDir}`);
  }

  // Cache the directory containing the binary for future runs
  const binDir = path.dirname(binaryPath);
  const cachedDir = await tc.cacheDir(binDir, "kiro-cli", version, arch);
  core.addPath(cachedDir);

  core.info(`Kiro CLI ${version} installed successfully.`);
}

function findBinary(dir: string, name: string): string | null {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findBinary(fullPath, name);
      if (found) return found;
    } else if (entry.name === name || entry.name === `${name}.exe`) {
      fs.chmodSync(fullPath, 0o755);
      return fullPath;
    }
  }
  return null;
}
