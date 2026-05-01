import { describe, it, expect, mock, beforeEach } from "bun:test";

const inputs: Record<string, string> = {
  github_token: "test-token",
  trigger_phrase: "@kiro",
};

mock.module("@actions/core", () => ({
  getInput: (name: string, _opts?: unknown) => inputs[name] ?? "",
  debug: () => {},
  info: () => {},
  warning: () => {},
}));

// Octokit mock — returns controllable data per test
let mockDiff = "diff --git a/foo.ts b/foo.ts\n+added line";
let mockComments: { user: { login: string }; body: string }[] = [];

mock.module("@actions/github", () => ({
  getOctokit: () => ({
    rest: {
      pulls: {
        get: async () => ({ data: mockDiff }),
      },
      issues: {
        listComments: async () => ({ data: mockComments }),
      },
    },
  }),
}));

const { buildPrompt } = await import("../src/prompt/build-prompt");
import type { GithubContext } from "../src/github/context";

function makeCtx(overrides: Partial<GithubContext> = {}): GithubContext {
  return { eventName: "unknown", owner: "myorg", repo: "myrepo", ...overrides };
}

describe("buildPrompt", () => {
  beforeEach(() => {
    mockDiff = "diff --git a/foo.ts b/foo.ts\n+added line";
    mockComments = [];
    inputs["trigger_phrase"] = "@kiro";
  });

  it("includes the task section with the user request", async () => {
    const prompt = await buildPrompt(makeCtx(), "refactor the auth module");
    expect(prompt).toContain("# Task");
    expect(prompt).toContain("refactor the auth module");
  });

  it("includes repo name", async () => {
    const prompt = await buildPrompt(makeCtx(), "do something");
    expect(prompt).toContain("myorg/myrepo");
  });

  it("extracts user request from comment body (strips trigger phrase)", async () => {
    const ctx = makeCtx({ commentBody: "@kiro fix the login bug", issueNumber: 3 });
    const prompt = await buildPrompt(ctx, "");
    expect(prompt).toContain("fix the login bug");
    expect(prompt).not.toContain("@kiro fix");
  });

  it("includes pr diff when context has a prNumber", async () => {
    const ctx = makeCtx({ prNumber: 5, prTitle: "My PR" });
    const prompt = await buildPrompt(ctx, "review this");
    expect(prompt).toContain("# Diff");
    expect(prompt).toContain("added line");
  });

  it("includes issue body when context has an issueNumber", async () => {
    const ctx = makeCtx({
      issueNumber: 8,
      issueTitle: "Bug: broken login",
      issueBody: "The login page crashes on submit.",
    });
    const prompt = await buildPrompt(ctx, "");
    expect(prompt).toContain("# Issue #8");
    expect(prompt).toContain("Bug: broken login");
    expect(prompt).toContain("crashes on submit");
  });

  it("includes existing comments when present", async () => {
    mockComments = [
      { user: { login: "alice" }, body: "Can you also fix the tests?" },
    ];
    const ctx = makeCtx({ issueNumber: 2 });
    const prompt = await buildPrompt(ctx, "fix something");
    expect(prompt).toContain("# Existing Comments");
    expect(prompt).toContain("alice");
    expect(prompt).toContain("fix the tests");
  });

  it("includes the instructions section", async () => {
    const prompt = await buildPrompt(makeCtx(), "do something");
    expect(prompt).toContain("# Instructions");
    expect(prompt).toContain("Make the requested changes");
  });

  it("skips diff section when no prNumber", async () => {
    const prompt = await buildPrompt(makeCtx({ issueNumber: 1 }), "something");
    expect(prompt).not.toContain("# Diff");
  });
});
