import * as core from "@actions/core";
import * as github from "@actions/github";

const KIRO_HEADER = "<!-- kiro-action-comment -->";

type Octokit = ReturnType<typeof github.getOctokit>;

export async function postProgressComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<number> {
  const body = `${KIRO_HEADER}\n> Kiro is working on this... ⚙️`;
  const { data } = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: issueNumber,
    body,
  });
  core.debug(`Posted progress comment #${data.id}`);
  return data.id;
}

export async function updateComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  commentId: number,
  body: string
): Promise<void> {
  await octokit.rest.issues.updateComment({
    owner,
    repo,
    comment_id: commentId,
    body: `${KIRO_HEADER}\n${body}`,
  });
  core.debug(`Updated comment #${commentId}`);
}

export async function findExistingKiroComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number
): Promise<number | undefined> {
  const { data } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  const existing = data.find((c) => c.body?.startsWith(KIRO_HEADER));
  return existing?.id;
}
