# Repository instructions

All changes must be made on a working branch and submitted through a pull request. Never push directly to `master` or `main`. The current default branch is `master`.

Run `npm test` before submitting a pull request. Merge only after required CI checks pass. See CONTRIBUTING.md for the GitHub branch protection configuration.

## Data persistence contract

Any value that a user can create, edit, complete, delete, or otherwise change in the interface is product data. Product data must have an explicit Firestore representation and a tested write/read path. `localStorage` may hold only a cache or offline queue for that data; it is never the authoritative store and a feature is incomplete if a user edit can remain local-only.

Every `localStorage` key must be classified in the persistence contract as one of:

- a Firestore-backed data cache or pending offline operation;
- a deliberately device-local UI preference or ephemeral runtime state; or
- a migration/backup safety copy with an explicit retention purpose.

Do not add a key merely because it is convenient to persist something. For every Firestore-backed field, add a regression test that edits it through the user-facing path, verifies the database write, and verifies that a fresh client can read the value back. A local mirror write alone does not satisfy this rule.
