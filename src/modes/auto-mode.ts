import * as core from "@actions/core";
import { GithubContext } from "../github/context.js";
import { buildPrompt } from "../prompt/build-prompt.js";
import { runKiro } from "../kiro/runner.js";

export async function runAutoMode(
  ctx: GithubContext,
  apiKey: string
): Promise<{ output: string }> {
  const explicitPrompt = core.getInput("prompt", { required: true });
  const prompt = await buildPrompt(ctx, explicitPrompt);
  const { output, exitCode } = await runKiro(prompt, apiKey);

  if (exitCode !== 0) {
    core.setFailed(`Kiro exited with code ${exitCode}\n\n${output}`);
  }

  return { output };
}
