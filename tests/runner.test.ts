import { describe, it, expect, mock } from "bun:test";
import { EventEmitter } from "events";

mock.module("@actions/core", () => ({
  debug: () => {},
  info: () => {},
  warning: () => {},
}));

// We mock child_process.spawn to return a fake process object
// rather than actually spawning kiro (which isn't installed in test env)
type FakeProc = {
  stdout: EventEmitter;
  stderr: EventEmitter;
  emit: (event: string, ...args: unknown[]) => void;
} & EventEmitter;

let spawnCallback: ((proc: FakeProc) => void) | null = null;

mock.module("child_process", () => ({
  spawn: (_cmd: string, _args: string[], _opts: unknown) => {
    const proc = new EventEmitter() as FakeProc;
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    // Let the test drive what the fake process does
    if (spawnCallback) spawnCallback(proc);
    return proc;
  },
}));

const { runKiro } = await import("../src/kiro/runner");

function makeProc(): FakeProc {
  const proc = new EventEmitter() as FakeProc;
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  return proc;
}

describe("runKiro", () => {
  it("resolves with stdout output and exit code 0", async () => {
    spawnCallback = (proc) => {
      setImmediate(() => {
        proc.stdout.emit("data", Buffer.from("Task completed successfully\n"));
        proc.emit("close", 0);
      });
    };
    const result = await runKiro("fix the bug", "test-api-key");
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Task completed successfully");
  });

  it("includes stderr in output", async () => {
    spawnCallback = (proc) => {
      setImmediate(() => {
        proc.stdout.emit("data", Buffer.from("stdout line\n"));
        proc.stderr.emit("data", Buffer.from("stderr warning\n"));
        proc.emit("close", 0);
      });
    };
    const result = await runKiro("do something", "test-api-key");
    expect(result.output).toContain("stdout line");
    expect(result.output).toContain("stderr warning");
  });

  it("strips ANSI escape codes from output", async () => {
    spawnCallback = (proc) => {
      setImmediate(() => {
        proc.stdout.emit("data", Buffer.from("\x1b[32mgreen text\x1b[0m\n"));
        proc.emit("close", 0);
      });
    };
    const result = await runKiro("do something", "test-api-key");
    expect(result.output).toBe("green text");
    expect(result.output).not.toContain("\x1b");
  });

  it("resolves with non-zero exit code on failure", async () => {
    spawnCallback = (proc) => {
      setImmediate(() => {
        proc.stderr.emit("data", Buffer.from("auth failed\n"));
        proc.emit("close", 1);
      });
    };
    const result = await runKiro("do something", "bad-key");
    expect(result.exitCode).toBe(1);
    expect(result.output).toContain("auth failed");
  });

  it("rejects when spawn itself fails (binary not found)", async () => {
    spawnCallback = (proc) => {
      setImmediate(() => {
        proc.emit("error", new Error("ENOENT: kiro not found"));
      });
    };
    await expect(runKiro("do something", "key")).rejects.toThrow("Failed to spawn kiro CLI");
  });
});
