# Contributing

The default branch is currently `master`. Treat both `master` and `main` as protected branches.

1. Create a working branch from the latest default branch.
2. Make changes and run `npm ci` and `npm test`.
3. Push the working branch and open a pull request against the default branch.
4. Merge through GitHub only after the required `Tests` check passes and review conversations are resolved.

Do not push commits directly to `master` or `main`, including when using an AI coding agent. Do not force-push or delete the default branch.

## CI

GitHub Actions runs the complete Vitest suite on pull requests targeting `master` or `main`, and after pushes to either branch. It uses a standard Linux runner, Node.js 22, read-only repository permissions, a 15-minute timeout, and cancels superseded runs. No deployment secrets are needed.

The sync tests mock Firebase. Passing CI verifies the existing test coverage; it does not prove that every user-editable field is persisted to a real database. Skill goals still need sync implementation and regression coverage.

## Required GitHub setting

A workflow file cannot block direct pushes by itself. A repository administrator must enable branch protection at:

https://github.com/shaundang/pomodoro-bench/settings/branches

Create a classic branch protection rule for `master` (and `main` if that branch is introduced):

- Require a pull request before merging.
- Leave required approving reviews disabled for a solo-maintainer repository; a pull request is still mandatory.
- Require status checks to pass before merging; select `Tests` after its first CI run.
- Require branches to be up to date before merging.
- Require conversation resolution before merging.
- Do not allow bypassing the above settings, including administrators.
- Keep force pushes and deletions disabled.

These settings must be applied on GitHub; committing this document does not enable them. Repository administrators can still change the protection settings themselves.

Deployment is separate from this CI workflow. Existing hosting settings remain the source of deployment behavior.
