// Workaround for kirodotdev/kiro#7929: kiro CLI emits ANSI escape codes in
// --no-interactive mode even when NO_COLOR=1 is set. Strip them before
// using the output in GitHub API calls or action outputs.
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\x1b\[[0-9;]*[a-zA-Z]|\x1b\][^\x07]*\x07|\x1b[PX^_][^\x1b]*\x1b\\|\x1b[@-Z\\-_]/g;

export function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}
