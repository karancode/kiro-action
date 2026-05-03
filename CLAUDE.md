# kiro-action

Official GitHub Action for Kiro — the AI-powered agentic IDE by AWS.

## What this does

Full agentic loop: `@kiro` mentions in PRs/issues → Kiro reads context → implements code → commits → opens PR.

Three trigger modes:
- **comment-mode**: `@kiro <instruction>` in any PR or issue comment
- **assign-mode**: Issue or PR assigned to `kirocli` (or configured `assignee_trigger`)
- **auto-mode**: Explicit `prompt:` input in a scheduled or push workflow

## Stack

- **Runtime**: TypeScript + Bun
- **Build**: `bun build src/index.ts --outfile dist/index.js` (dist/ is committed)
- **Tests**: `bun test` (test files in `tests/`)
- **GitHub API**: `@actions/github` + `@octokit/rest`

## Key files

```
src/
  index.ts                 # Entry point — reads inputs, detects mode, dispatches
  setup/install-kiro.ts    # Installs Kiro CLI via official install script, caches by version
  github/
    context.ts             # Parses GitHub event payload into typed GithubContext
    comment.ts             # Sticky progress comment (post + update)
    pr.ts                  # Branch creation, commit, PR open
  modes/
    detect.ts              # Determines mode from event + inputs
    comment-mode.ts        # Handles @kiro comment trigger
    assign-mode.ts         # Handles assignment trigger
    auto-mode.ts           # Handles explicit prompt: input
  prompt/build-prompt.ts   # Builds context-rich prompt for Kiro
  kiro/runner.ts           # Spawns kiro chat --no-interactive, returns cleaned output
  utils/
    auth.ts                # Validates KIRO_API_KEY
    ansi.ts                # Strips ANSI escape codes (workaround for kiro#7929)
```

## CLI installation

The Kiro CLI is installed via the official install script at `https://cli.kiro.dev/install`.
Version is resolved at runtime from the stable manifest at `https://prod.download.cli.kiro.dev/stable/latest/manifest.json`.
The binary is named `kiro-cli` and installed to `~/.local/bin/`.

## Commands

```bash
bun install          # Install dependencies
bun run typecheck    # Type-check without emitting
bun test             # Run unit tests
bun run build        # Bundle to dist/index.js
bun run format       # Format source files
```
