# Contributing

Thanks for contributing to ComLinkr. This guide sets review standards for the whole `comlinkr-app` repository.
Branch, commit and pull request naming, and the branch flow (`main`, `development`, `hotfix/…`), are in the root
[README](../README.md#naming).

## Pull Request Rules

1. Keep PR scope focused; avoid mixing unrelated changes.
2. Link the triage line, issue or ticket in the PR description.
3. Include validation steps (build, tests, the journey walked on the phone).
4. Add screenshots for UI changes (web/mobile).
5. Update docs when architecture, behaviour or setup changes (see "Documentation Requirement").
6. Ensure no secrets are added to Git history (`.env` files, keystores, keys).

## Review Requirements

1. Minimum one reviewer approval.
2. Author must resolve all review comments.
3. CI/build checks should pass before merge.
4. Prefer squash merge for clean history.

## Local Checklist Before Opening PR

From the repository root, for mobile changes:

```bash
cd frontend/apps/mobile
pnpm typecheck
npx expo start -c
```

From the repository root, for backend changes:

```bash
cd backend
npx tsc --noEmit
pnpm test:unit
```

Then walk the changed journey on a phone against the local backend (see
[../docs/device-testing.md](../docs/device-testing.md)).

## Documentation Requirement

Docs live in the root [docs/](../docs/README.md) folder. Any change in what the product does updates its system
review (`docs/system-review/`) in the same pull request, and every fix or feature gets a build note
(`docs/build/`). The full rules are in the root [CLAUDE.md](../CLAUDE.md#where-things-are-written-down).
