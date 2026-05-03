export interface ParsedOutput {
  prTitle: string | undefined;
  summary: string | undefined;
}

const PR_TITLE_RE = /^PR_TITLE:\s*(.+)$/m;

function extractSummary(output: string): string | undefined {
  const summaryStart = output.search(/^##\s+Summary\s*$/im);
  if (summaryStart === -1) return undefined;

  const bodyStart = output.indexOf("\n", summaryStart) + 1;
  const nextHeading = output.search(/\n##\s+/);
  const prTitleIdx = output.search(/\nPR_TITLE:/);

  const endIdx = [nextHeading, prTitleIdx]
    .filter((i) => i > bodyStart)
    .reduce((a, b) => Math.min(a, b), output.length);

  return output.slice(bodyStart, endIdx).trim() || undefined;
}

export function parseKiroOutput(output: string): ParsedOutput {
  const titleMatch = output.match(PR_TITLE_RE);

  return {
    prTitle: titleMatch?.[1]?.trim(),
    summary: extractSummary(output),
  };
}
