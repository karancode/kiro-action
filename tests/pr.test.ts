import { describe, it, expect, mock, beforeEach } from "bun:test";

const inputs: Record<string, string> = {};
const execCalls: string[][] = [];
let statusOutput = "";

mock.module("@actions/core", () => ({
  getInput: (name: string) => inputs[name] ?? "",
  debug: () => {},
  info: () => {},
  warning: () => {},
}));

mock.module("@actions/github", () => ({ getOctokit: () => ({}) }));

mock.module("@actions/exec", () => ({
  exec: async (cmd: string, args: string[], opts?: { listeners?: { stdout?: (d: Buffer) => void } }) => {
    execCalls.push([cmd, ...args]);
    // Feed mock status output when git status --porcelain is called
    if (args.includes("--porcelain") && opts?.listeners?.stdout) {
      opts.listeners.stdout(Buffer.from(statusOutput));
    }
    return 0;
  },
}));

const { createBranch, commitAndPush, openPullRequest, getDefaultBranch } =
  await import("../src/github/pr");

function makeOctokit(overrides: Record<string, unknown> = {}) {
  return {
    rest: {
      pulls: {
        create: async () => ({ data: { html_url: "https://github.com/owner/repo/pull/99" } }),
        ...overrides,
      },
      repos: {
        get: async () => ({ data: { default_branch: "main" } }),
        ...overrides,
      },
    },
  } as any;
}

describe("createBranch", () => {
  beforeEach(() => {
    execCalls.length = 0;
    Object.keys(inputs).forEach((k) => delete inputs[k]);
  });

  it("creates branch with default prefix kiro/", async () => {
    const name = await createBranch(5, "Fix the login bug");
    expect(name).toStartWith("kiro/5-");
    expect(name).toContain("fix-the-login-bug");
    expect(execCalls.some((c) => c[0] === "git" && c[1] === "checkout")).toBe(true);
  });

  it("uses custom branch_prefix input", async () => {
    inputs["branch_prefix"] = "bot/";
    const name = await createBranch(3, "My feature");
    expect(name).toStartWith("bot/3-");
  });

  it("slugifies special characters in title", async () => {
    const name = await createBranch(1, "Fix: typo & formatting!");
    expect(name).not.toContain(" ");
    expect(name).not.toContain("&");
    expect(name).not.toContain("!");
    expect(name).not.toContain(":");
  });
});

describe("commitAndPush", () => {
  beforeEach(() => {
    execCalls.length = 0;
    statusOutput = "";
  });

  it("returns false and skips commit when no changes", async () => {
    statusOutput = "";
    const result = await commitAndPush("kiro/1-fix", "chore: kiro changes");
    expect(result).toBe(false);
    expect(execCalls.some((c) => c.includes("commit"))).toBe(false);
  });

  it("commits and pushes when there are changes", async () => {
    statusOutput = "M  src/foo.ts\n";
    const result = await commitAndPush("kiro/1-fix", "chore: kiro changes");
    expect(result).toBe(true);
    expect(execCalls.some((c) => c.includes("commit"))).toBe(true);
    expect(execCalls.some((c) => c.includes("push"))).toBe(true);
  });
});

describe("openPullRequest", () => {
  it("returns the PR url", async () => {
    const url = await openPullRequest(
      makeOctokit(), "owner", "repo", "kiro/1-fix", "Fix", "body", "main"
    );
    expect(url).toBe("https://github.com/owner/repo/pull/99");
  });
});

describe("getDefaultBranch", () => {
  it("returns the default branch name", async () => {
    const branch = await getDefaultBranch(makeOctokit(), "owner", "repo");
    expect(branch).toBe("main");
  });
});
