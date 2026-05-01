import { describe, it, expect } from "bun:test";
import { stripAnsi } from "../src/utils/ansi";

describe("stripAnsi", () => {
  it("removes color codes", () => {
    expect(stripAnsi("\x1b[32mhello\x1b[0m")).toBe("hello");
  });

  it("removes bold codes", () => {
    expect(stripAnsi("\x1b[1mworld\x1b[22m")).toBe("world");
  });

  it("removes cursor movement sequences", () => {
    expect(stripAnsi("\x1b[2J\x1b[H")).toBe("");
  });

  it("leaves plain text unchanged", () => {
    expect(stripAnsi("plain text")).toBe("plain text");
  });

  it("handles mixed content", () => {
    expect(stripAnsi("\x1b[33mwarning:\x1b[0m something went wrong")).toBe(
      "warning: something went wrong"
    );
  });
});
