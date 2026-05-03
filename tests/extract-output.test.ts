import { describe, it, expect } from "bun:test";
import { parseKiroOutput } from "../src/utils/extract-output";

describe("parseKiroOutput", () => {
  it("extracts PR_TITLE and summary when both are present", () => {
    const output = `
I made some changes to the codebase.

## Summary
- Added DELETE /users/:id endpoint
- Wrote unit tests covering 404 and 200 cases

PR_TITLE: Add DELETE endpoint for user deletion
`.trim();

    const result = parseKiroOutput(output);
    expect(result.prTitle).toBe("Add DELETE endpoint for user deletion");
    expect(result.summary).toContain("Added DELETE /users/:id endpoint");
    expect(result.summary).toContain("Wrote unit tests");
  });

  it("returns undefined for both when output has neither", () => {
    const result = parseKiroOutput("I ran the tests and everything passed.");
    expect(result.prTitle).toBeUndefined();
    expect(result.summary).toBeUndefined();
  });

  it("extracts PR_TITLE even without summary block", () => {
    const output = "Did the work.\n\nPR_TITLE: Fix login redirect bug";
    const result = parseKiroOutput(output);
    expect(result.prTitle).toBe("Fix login redirect bug");
    expect(result.summary).toBeUndefined();
  });

  it("extracts summary even without PR_TITLE line", () => {
    const output = "Work done.\n\n## Summary\n- Updated README\n- Fixed typo";
    const result = parseKiroOutput(output);
    expect(result.summary).toContain("Updated README");
    expect(result.prTitle).toBeUndefined();
  });

  it("trims whitespace from extracted values", () => {
    const output = "## Summary\n  - Fixed bug  \n\nPR_TITLE:   Trim me  ";
    const result = parseKiroOutput(output);
    expect(result.prTitle).toBe("Trim me");
    expect(result.summary).toContain("Fixed bug");
  });

  it("stops summary extraction at the next heading", () => {
    const output = "## Summary\n- Did X\n\n## Other Section\nNot part of summary\n\nPR_TITLE: Title";
    const result = parseKiroOutput(output);
    expect(result.summary).not.toContain("Not part of summary");
    expect(result.summary).toContain("Did X");
  });
});
