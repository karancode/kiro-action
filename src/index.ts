import * as core from "@actions/core";
import { installKiro } from "./setup/install-kiro.js";
import { validateAuth } from "./utils/auth.js";
import { parseGithubContext } from "./github/context.js";
import { detectMode } from "./modes/detect.js";
import { runCommentMode } from "./modes/comment-mode.js";
import { runAssignMode } from "./modes/assign-mode.js";
import { runAutoMode } from "./modes/auto-mode.js";

async function run(): Promise<void> {
  try {
    const kiroVersion = core.getInput("kiro_version") || "2.0.0";
    await installKiro(kiroVersion);

    const apiKey = validateAuth();
    const ctx = parseGithubContext();
    const mode = detectMode(ctx);

    if (mode === "skip") {
      core.info("Nothing to do.");
      return;
    }

    core.info(`Running in ${mode} mode.`);

    let result: { branchName?: string; prUrl?: string; output: string };

    switch (mode) {
      case "comment":
        result = await runCommentMode(ctx, apiKey);
        break;
      case "assign":
        result = await runAssignMode(ctx, apiKey);
        break;
      case "auto":
        result = await runAutoMode(ctx, apiKey);
        break;
    }

    core.setOutput("kiro_output", result.output);
    if (result.branchName) core.setOutput("branch_name", result.branchName);
    if (result.prUrl) core.setOutput("pr_url", result.prUrl);
  } catch (err) {
    core.setFailed(err instanceof Error ? err.message : String(err));
  }
}

run();
