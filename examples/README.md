# Examples

Workflow files you can drop into `.github/workflows/` and adapt. They're independent — combine whichever you want.

| File | What it does | Trigger |
|---|---|---|
| [`kiro.yml`](kiro.yml) | Default — `/kiro` mentions and `kiro` assignments | Comments, assignments |
| [`issue-triage.yml`](issue-triage.yml) | Auto-label new issues, ask for missing info | New issue |
| [`pr-review.yml`](pr-review.yml) | Code review on every PR | PR opened / updated |
| [`security-review.yml`](security-review.yml) | OWASP-style review on sensitive paths only | PR touching auth, billing, api, infra |
| [`external-contributor-review.yml`](external-contributor-review.yml) | Stricter review for PRs from non-members | PR from external contributor |
| [`dependency-audit.yml`](dependency-audit.yml) | Weekly dependency upgrade PR | Cron + manual dispatch |
| [`docs-sync.yml`](docs-sync.yml) | Keep docs in sync with code changes | PR modifying source |
| [`code-reviewer-agent.yml`](code-reviewer-agent.yml) | PR review using a custom Kiro agent | PR opened |
| [`ci-failure-fix.yml`](ci-failure-fix.yml) | Auto-fix failing CI on PR branches | CI workflow failure |

All examples assume `KIRO_API_KEY` is set as a repository secret. See the [main README](../README.md#quickstart) for setup.
