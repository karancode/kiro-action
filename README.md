# kiro-action

GitHub Action for [Kiro](https://kiro.dev) — the AI-powered agentic IDE by AWS.

Bring Kiro's full agentic loop into your GitHub workflows: mention `@kiro` in any PR or issue, assign it to an issue, or run it on a schedule — and Kiro reads the context, implements the changes, and opens a pull request.

---

## How it works

Three trigger modes:

| Mode | How to trigger | What happens |
|---|---|---|
| **comment** | Comment `@kiro <instruction>` on any PR or issue | Kiro reads the context, implements the change, commits, opens a PR |
| **assign** | Assign the issue or PR to `kiro` | Kiro reads the issue body, implements a solution, opens a PR |
| **auto** | Set `prompt:` in a scheduled or push workflow | Kiro runs the prompt against the repo, returns structured output |

---

## Quickstart

### 1. Add your Kiro API key as a secret

In your repo: **Settings → Secrets and variables → Actions → New repository secret**

- Name: `KIRO_API_KEY`
- Value: your Kiro API key (from [kiro.dev](https://kiro.dev))

### 2. Create a workflow file

```yaml
# .github/workflows/kiro.yml
name: Kiro

on:
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  issues:
    types: [assigned]
  pull_request:
    types: [assigned]

jobs:
  kiro:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: karancode/kiro-action@main
        with:
          kiro_api_key: ${{ secrets.KIRO_API_KEY }}
```

### 3. Trigger it

Comment on any issue or PR:

```
@kiro fix the null pointer exception in src/auth/login.ts
```

Kiro will:
1. Post a progress comment
2. Read the PR diff / issue body for context
3. Implement the fix
4. Commit the changes and open a pull request
5. Update the comment with a summary and PR link

---

## Trigger modes in detail

### Comment mode

Mention `@kiro` followed by your instruction in any issue or issue comment, PR comment, or PR review comment.

```
@kiro refactor this function to use async/await
@kiro add unit tests for the new billing module
@kiro explain what this code does and suggest improvements
```

Only users with **write access** to the repo can trigger Kiro via comments.

### Assign mode

Assign an issue or PR to the `kiro` GitHub user. Kiro will read the issue title and body as its task description and open a PR with the implementation.

Useful for triaging issues in bulk — label them, assign to `kiro`, and let it work through them.

### Auto mode

Run Kiro on a schedule or in response to push events using an explicit `prompt:` input:

```yaml
- uses: karancode/kiro-action@main
  with:
    kiro_api_key: ${{ secrets.KIRO_API_KEY }}
    prompt: |
      Review all TODO comments in the codebase.
      For each one, either implement the fix or open a GitHub issue.
```

The output is available as a step output for downstream steps:

```yaml
- uses: karancode/kiro-action@main
  id: kiro
  with:
    kiro_api_key: ${{ secrets.KIRO_API_KEY }}
    prompt: 'Summarise what changed in the last 10 commits'

- run: echo "${{ steps.kiro.outputs.kiro_output }}"
```

---

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `kiro_api_key` | Yes | — | Kiro API key. Use a repository secret. |
| `github_token` | No | `github.token` | GitHub token for API operations. |
| `prompt` | No | — | Explicit prompt for auto mode. |
| `trigger_phrase` | No | `@kiro` | Comment phrase that activates comment mode. |
| `assignee_trigger` | No | `kiro` | GitHub username that activates assign mode. |
| `branch_prefix` | No | `kiro/` | Prefix for branches created by Kiro. |

## Outputs

| Output | Description |
|---|---|
| `branch_name` | Branch created by Kiro (if file changes were made). |
| `pr_url` | URL of the pull request opened by Kiro (if any). |
| `kiro_output` | Cleaned text output from the Kiro CLI. |

---

## Permissions

The workflow job needs these permissions:

```yaml
permissions:
  contents: write       # push branches
  issues: write         # post and update comments
  pull-requests: write  # open pull requests
```

---

## Examples

### Automated security review on every PR

```yaml
name: Security Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: karancode/kiro-action@main
        with:
          kiro_api_key: ${{ secrets.KIRO_API_KEY }}
          prompt: |
            Review the changes in this pull request for security issues.
            Focus on: injection vulnerabilities, auth bypasses, secrets in code,
            and insecure dependencies. Post your findings as a PR review comment.
```

### Weekly dependency audit

```yaml
name: Dependency Audit

on:
  schedule:
    - cron: '0 9 * * 1'  # every Monday at 9am

jobs:
  audit:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
    steps:
      - uses: actions/checkout@v4
      - uses: karancode/kiro-action@main
        with:
          kiro_api_key: ${{ secrets.KIRO_API_KEY }}
          prompt: |
            Check for outdated or vulnerable dependencies.
            Update any that have safe, non-breaking upgrades available
            and open a pull request with the changes.
```

---

## Development

```bash
bun install          # install dependencies
bun run typecheck    # type-check without emitting
bun test             # run unit tests (47 tests)
bun run build        # bundle to dist/index.js
bun run format       # format source files
```

See [CLAUDE.md](CLAUDE.md) for architecture details.

---

## Roadmap

- [ ] Support AWS IAM / SIGV4 authentication (no long-lived API keys)
- [ ] Kiro spec-driven mode: issue → auto-generate `.kiro/specs/` → implement
- [ ] Transfer to `github.com/kirodotdev/kiro-action`

---

## License

MIT
