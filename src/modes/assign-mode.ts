import * as core from "@actions/core";
import * as github from "@actions/github";
import { GithubContext } from "../github/context.js";
import { buildPrompt } from "../prompt/build-prompt.js";
import { runKiro } from "../kiro/runner.js";
import { postProgressComment, updateComment } from "../github/comment.js";
import {
  createBranch,
  commitAndPush,
  getDefaultBranch,
  openPullRequest,
} from "../github/pr.js";

export async function runAssignMode(
  ctx: GithubContext,
  apiKey: string
): Promise<{ branchName?: string; prUrl?: string; output: string }> {
  const token = core.getInput("github_token", { required: true });
  const octokit = github.getOctokit(token);
  const issueNumber = ctx.prNumber ?? ctx.issueNumber!;

  const commentId = await postProgressComment(octokit, ctx.owner, ctx.repo, issueNumber);

  const userRequest = ctx.issueBody ?? ctx.prBody ?? "";
  const prompt = await buildPrompt(ctx, userRequest);
  const { output, exitCode } = await runKiro(prompt, apiKey);

  if (exitCode !== 0) {
    await updateComment(
      octokit, ctx.owner, ctx.repo, commentId,
      `> Kiro encountered an error (exit code ${exitCode}).\n\n<details><summary>Output</summary>\n\n\`\`\`\n${output}\n\`\`\`\n</details>`
    );
    core.setFailed(`Kiro exited with code ${exitCode}`);
    return { output };
  }

  const baseBranch = await getDefaultBranch(octokit, ctx.owner, ctx.repo);
  const title = ctx.issueTitle ?? ctx.prTitle ?? `Kiro changes for #${issueNumber}`;
  const branchName = await createBranch(issueNumber, title);
  const hadChanges = await commitAndPush(branchName, `chore: kiro changes for #${issueNumber}`);

  let prUrl: string | undefined;
  if (hadChanges) {
    prUrl = await openPullRequest(
      octokit, ctx.owner, ctx.repo,
      branchName,
      `[Kiro] ${title}`,
      `Automated changes from Kiro for #${issueNumber}.\n\n${output}`,
      baseBranch
    );
  }

  const finalBody = hadChanges
    ? `Kiro has completed the task. ${prUrl ? `[View PR](${prUrl})` : ""}\n\n<details><summary>Summary</summary>\n\n${output}\n</details>`
    : `Kiro completed the task but made no file changes.\n\n<details><summary>Summary</summary>\n\n${output}\n</details>`;

  await updateComment(octokit, ctx.owner, ctx.repo, commentId, finalBody);
  return { branchName: hadChanges ? branchName : undefined, prUrl, output };
}
