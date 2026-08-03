# Branch protection (`main`)

Configured via **repository ruleset** `main-protection` (not classic branch protection).

Same policy as [radio-tracer-java](https://github.com/radio-tracer/radio-tracer-java/blob/main/docs/BRANCH-PROTECTION.md) and radio-tracer-cve-import.

## Rules (everyone except bypass actors)

1. **Pull request required** before merging into `main`
2. **At least 1 approving review**
3. **Code owner review required** — approval must come from [@radio-tracer/approvers](https://github.com/orgs/radio-tracer/teams/approvers)
4. **You cannot approve your own PR** (GitHub platform rule)
5. **Status check** must pass: `Build & test` (site structure validation)
6. Branch must be **up to date** with `main` before merge
7. **No force-push** to `main`; **no deleting** `main`
8. Review threads must be resolved

## Exception

**@mayaba** is a ruleset **bypass actor** (`always`).

## Deploy

Push/merge to `main` runs `.github/workflows/pages.yml` → https://radio-tracer.github.io/
