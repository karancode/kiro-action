import { describe, it, expect } from "bun:test";
import { parseGithubContext } from "../src/github/context";

function makeRawCtx(overrides: Record<string, unknown> = {}) {
  return {
    eventName: "issue_comment",
    repo: { owner: "myorg", repo: "myrepo" },
    payload: {},
    ...overrides,
  } as any;
}

describe("parseGithubContext", () => {
  it("parses issue_comment event correctly", () => {
    const raw = makeRawCtx({
      payload: {
        comment: { id: 42, body: "@kiro fix the tests", user: { login: "alice" } },
        issue: { number: 7, pull_request: undefined },
      },
    });
    const ctx = parseGithubContext(raw);
    expect(ctx.eventName).toBe("issue_comment");
    expect(ctx.owner).toBe("myorg");
    expect(ctx.repo).toBe("myrepo");
    expect(ctx.commentBody).toBe("@kiro fix the tests");
    expect(ctx.commentId).toBe(42);
    expect(ctx.commentAuthor).toBe("alice");
    expect(ctx.issueNumber).toBe(7);
    expect(ctx.prNumber).toBeUndefined();
  });

  it("sets prNumber when issue has a pull_request field", () => {
    const raw = makeRawCtx({
      payload: {
        comment: { id: 1, body: "@kiro", user: { login: "bob" } },
        issue: { number: 12, pull_request: { url: "https://..." } },
      },
    });
    const ctx = parseGithubContext(raw);
    expect(ctx.prNumber).toBe(12);
    expect(ctx.issueNumber).toBe(12);
  });

  it("parses issues.assigned event", () => {
    const raw = makeRawCtx({
      eventName: "issues",
      payload: {
        issue: { number: 3, title: "Bug report", body: "It crashes." },
        assignee: { login: "kiro" },
      },
    });
    const ctx = parseGithubContext(raw);
    expect(ctx.eventName).toBe("issues");
    expect(ctx.issueNumber).toBe(3);
    expect(ctx.issueTitle).toBe("Bug report");
    expect(ctx.assignee).toBe("kiro");
  });

  it("parses pull_request event", () => {
    const raw = makeRawCtx({
      eventName: "pull_request",
      payload: {
        pull_request: { number: 7, title: "My PR", body: "does stuff" },
        assignee: { login: "kiro" },
      },
    });
    const ctx = parseGithubContext(raw);
    expect(ctx.prNumber).toBe(7);
    expect(ctx.prTitle).toBe("My PR");
    expect(ctx.assignee).toBe("kiro");
  });

  it("returns unknown eventName for unhandled events", () => {
    const raw = makeRawCtx({ eventName: "workflow_run", payload: {} });
    const ctx = parseGithubContext(raw);
    expect(ctx.eventName).toBe("workflow_run");
    expect(ctx.issueNumber).toBeUndefined();
    expect(ctx.prNumber).toBeUndefined();
  });
});
