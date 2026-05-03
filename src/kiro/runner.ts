import * as core from "@actions/core";
import { spawn } from "child_process";
import { stripAnsi } from "../utils/ansi.js";

export interface RunResult {
  output: string;
  exitCode: number;
}

export async function runKiro(prompt: string, apiKey: string): Promise<RunResult> {
  const extraArgs = core.getInput("kiro_args").trim().split(/\s+/).filter(Boolean);
  const args = ["chat", "--no-interactive", ...extraArgs, prompt];

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    const proc = spawn("kiro-cli", args, {
      env: {
        ...process.env,
        KIRO_API_KEY: apiKey,
        NO_COLOR: "1",
        TERM: "dumb",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    proc.stdout.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
      // Stream cleaned output to action log without exposing the prompt content
      const line = stripAnsi(chunk.toString()).trim();
      if (line) core.debug(`kiro: ${line}`);
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      errChunks.push(chunk);
      const line = stripAnsi(chunk.toString()).trim();
      if (line) core.debug(`kiro stderr: ${line}`);
    });

    proc.on("error", (err) => {
      reject(new Error(`Failed to spawn kiro CLI: ${err.message}`));
    });

    proc.on("close", (code) => {
      const rawOutput = Buffer.concat(chunks).toString("utf8");
      const rawErr = Buffer.concat(errChunks).toString("utf8");
      const output = stripAnsi(rawOutput + (rawErr ? `\n${rawErr}` : "")).trim();
      resolve({ output, exitCode: code ?? 1 });
    });
  });
}
