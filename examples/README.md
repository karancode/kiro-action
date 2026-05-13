# Examples

Ready-to-use workflow files for common use cases. Drop them into your repo's `.github/workflows/` directory and adapt as needed.

| File | What it does | Trigger |
|---|---|---|
| [`kiro.yml`](kiro.yml) | The default workflow — handles `/kiro` mentions and `kiro` assignments | Comments and assignments |
| [`issue-triage.yml`](issue-triage.yml) | Auto-label new issues, ask for missing info | New issue opened |
| [`pr-review.yml`](pr-review.yml) | Comprehensive code review on every PR | PR opened or updated |
| [`security-review.yml`](security-review.yml) | Security-focused review on sensitive paths only | PR touching auth/billing/api/infra |
| [`external-contributor-review.yml`](external-contributor-review.yml) | Strict review for non-team contributors | PR from non-member |
| [`dependency-audit.yml`](dependency-audit.yml) | Weekly dependency upgrade PR | Cron + manual |
| [`docs-sync.yml`](docs-sync.yml) | Keep docs in sync with code changes | PR modifying source |
| [`code-reviewer-agent.yml`](code-reviewer-agent.yml) | PR review using a custom Kiro agent | PR opened |
| [`ci-failure-fix.yml`](ci-failure-fix.yml) | Auto-fix CI failures on PR branches | CI workflow failure |

## Setup

All examples assume `KIRO_API_KEY` is set as a repository secret. See the [main README](../README.md#quickstart) for setup instructions.

## Combining examples

These workflows are independent — you can use any combination. A typical setup might be:

- `kiro.yml` for human-triggered tasks
- `pr-review.yml` for every PR
- `security-review.yml` for sensitive changes
- `dependency-audit.yml` running weekly

Each runs in its own job; they don't conflict with each other.
