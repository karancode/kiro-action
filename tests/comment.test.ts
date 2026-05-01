import { describe, it, expect, mock } from "bun:test";

mock.module("@actions/core", () => ({
  getInput: () => "",
  debug: () => {},
  info: () => {},
  warning: () => {},
}));

mock.module("@actions/github", () => ({ getOctokit: () => ({}) }));

const { postProgressComment, updateComment, findExistingKiroComment } =
  await import("../src/github/comment");

const HEADER = "<!-- kiro-action-comment -->";

function makeOctokit(overrides: Record<string, unknown> = {}) {
  return {
    rest: {
      issues: {
        createComment: async ({ body }: { body: string }) => ({
          data: { id: 101, body },
        }),
        updateComment: async () => ({ data: {} }),
        listComments: async () => ({ data: [] }),
        ...overrides,
      },
    },
  } as any;
}

describe("postProgressComment", () => {
  it("calls createComment and returns the comment id", async () => {
    const octokit = makeOctokit();
    const id = await postProgressComment(octokit, "owner", "repo", 7);
    expect(id).toBe(101);
  });

  it("includes the kiro header in the posted body", async () => {
    let capturedBody = "";
    const octokit = makeOctokit({
      createComment: async ({ body }: { body: string }) => {
        capturedBody = body;
        return { data: { id: 1, body } };
      },
    });
    await postProgressComment(octokit, "owner", "repo", 7);
    expect(capturedBody).toContain(HEADER);
    expect(capturedBody).toContain("Kiro is working on this");
  });
});

describe("updateComment", () => {
  it("prepends header to the body when updating", async () => {
    let capturedBody = "";
    const octokit = makeOctokit({
      updateComment: async ({ body }: { body: string }) => {
        capturedBody = body;
        return { data: {} };
      },
    });
    await updateComment(octokit, "owner", "repo", 42, "Done!");
    expect(capturedBody).toStartWith(HEADER);
    expect(capturedBody).toContain("Done!");
  });
});

describe("findExistingKiroComment", () => {
  it("returns undefined when no kiro comment exists", async () => {
    const octokit = makeOctokit({
      listComments: async () => ({
        data: [
          { id: 1, body: "regular comment" },
          { id: 2, body: "another comment" },
        ],
      }),
    });
    const id = await findExistingKiroComment(octokit, "owner", "repo", 7);
    expect(id).toBeUndefined();
  });

  it("returns the id of an existing kiro comment", async () => {
    const octokit = makeOctokit({
      listComments: async () => ({
        data: [
          { id: 10, body: "regular comment" },
          { id: 20, body: `${HEADER}\nKiro is working on this...` },
        ],
      }),
    });
    const id = await findExistingKiroComment(octokit, "owner", "repo", 7);
    expect(id).toBe(20);
  });

  it("returns the first kiro comment when multiple exist", async () => {
    const octokit = makeOctokit({
      listComments: async () => ({
        data: [
          { id: 20, body: `${HEADER}\nFirst kiro comment` },
          { id: 30, body: `${HEADER}\nSecond kiro comment` },
        ],
      }),
    });
    const id = await findExistingKiroComment(octokit, "owner", "repo", 7);
    expect(id).toBe(20);
  });
});
