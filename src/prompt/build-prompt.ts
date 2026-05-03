import * as core from "@actions/core";
import * as github from "@actions/github";
import { GithubContext } from "../github/context.js";

export interface PromptContext {
  userRequest: string;
  repoFullName: string;
  issueOrPrNumber?: number;
  title?: string;
  body?: string;
  diff?: string;
  existingComments?: string;
  fileTree?: string;
}

async function fetchPrDiff(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  prNumber: number
): Promise<string> {
  try {
    const { data } = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: { format: "diff" },
    });
    // data is a string when format is diff
    return String(data).slice(0, 20000); // cap diff size
  } catch (err) {
    core.warning(`Could not fetch PR diff: ${err}`);
    return "";
  }
}

async function fetchIssueComments(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<string> {
  try {
    const { data } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 20,
    });
    return data
      .map((c) => `**${c.user?.login}**: ${c.body}`)
      .join("\n\n")
      .slice(0, 8000);
  } catch (err) {
    core.warning(`Could not fetch comments: ${err}`);
    return "";
  }
}

function extractUserRequest(commentBody: string, triggerPhrase: string): string {
  const idx = commentBody.indexOf(triggerPhrase);
  if (idx === -1) return commentBody.trim();
  return commentBody.slice(idx + triggerPhrase.length).trim();
}

export async function buildPrompt(ctx: GithubContext, userRequest: string): Promise<string> {
  const token = core.getInput("github_token", { required: true });
  const octokit = github.getOctokit(token);
  const triggerPhrase = core.getInput("trigger_phrase") || "@kiro";
  const repoFullName = `${ctx.owner}/${ctx.repo}`;

  const request = ctx.commentBody
    ? extractUserRequest(ctx.commentBody, triggerPhrase)
    : userRequest;

  const parts: string[] = [];

  parts.push(`# Task\n${request}`);
  parts.push(`# Repository\n${repoFullName}`);

  if (ctx.prNumber) {
    parts.push(`# Pull Request #${ctx.prNumber}`);
    if (ctx.prTitle) parts.push(`**Title**: ${ctx.prTitle}`);
    if (ctx.prBody) parts.push(`**Description**:\n${ctx.prBody}`);

    const diff = await fetchPrDiff(octokit, ctx.owner, ctx.repo, ctx.prNumber);
    if (diff) parts.push(`# Diff\n\`\`\`diff\n${diff}\n\`\`\``);

    const comments = await fetchIssueComments(octokit, ctx.owner, ctx.repo, ctx.prNumber);
    if (comments) parts.push(`# Existing Comments\n${comments}`);
  } else if (ctx.issueNumber) {
    parts.push(`# Issue #${ctx.issueNumber}`);
    if (ctx.issueTitle) parts.push(`**Title**: ${ctx.issueTitle}`);
    if (ctx.issueBody) parts.push(`**Body**:\n${ctx.issueBody}`);

    const comments = await fetchIssueComments(octokit, ctx.owner, ctx.repo, ctx.issueNumber);
    if (comments) parts.push(`# Existing Comments\n${comments}`);
  }

  parts.push(
    `# Instructions\n` +
    `Make the requested changes to the repository. Be concise and focused.\n\n` +
    `After completing your changes, end your response with EXACTLY this format (no extra text after):\n\n` +
    `## Summary\n` +
    `- <what you changed, one bullet per logical change>\n` +
    `- <...>\n\n` +
    `PR_TITLE: <a concise, imperative-mood title for a pull request, max 72 chars>`
  );

  return parts.join("\n\n");
}
