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

## No Code Comments

* Do not add comments to source code.
* Remove existing code comments from any file you modify.
* Do not leave commented-out code; delete it instead.
* Do not use inline comments, block comments, TODO comments, FIXME comments, or explanatory comments.
* Code must be self-explanatory through clear naming, small functions, appropriate abstractions, and straightforward control flow.
* If code requires a comment to explain what it does, refactor the code to make its intent clear instead.
* Do not remove required legal/license headers, generated-file markers, linter directives, type-checker directives, or tool-specific annotations that are necessary for the code to build, lint, test, or run correctly.


## Security Review

Security must be evaluated for every code change before the task is considered complete.

* Review all modified code for potential security vulnerabilities.
* Never hardcode secrets, API keys, tokens, passwords, credentials, private keys, or sensitive configuration.
* Never log or expose secrets, credentials, authentication tokens, or sensitive user data.
* Validate and sanitize all untrusted or external inputs.
* Prevent common vulnerabilities such as injection, path traversal, insecure deserialization, SSRF, XSS, and command execution.
* Use parameterized queries instead of constructing SQL queries from user-controlled input.
* Avoid executing shell commands with unsanitized or user-controlled values.
* Enforce authentication and authorization where access to protected resources is required.
* Follow the principle of least privilege for IAM roles, service accounts, filesystem permissions, database access, and cloud resources.
* Do not weaken existing security controls merely to make tests, builds, or deployments pass.
* Do not disable TLS/SSL verification or certificate validation unless explicitly required and justified.
* Do not introduce insecure defaults. Security-sensitive behavior should fail closed rather than fail open.
* Review new or updated dependencies for known security risks and avoid unnecessary dependencies.
* Ensure temporary files, generated artifacts, logs, and error messages do not expose sensitive information.
* Preserve existing security controls unless the task explicitly requires changing them.
* When modifying infrastructure, CI/CD, IAM, networking, storage, or deployment configuration, review the resulting permissions and exposure.

### Required Security Check

Before completing any task, explicitly check:

1. **Secrets** — Are any credentials or sensitive values exposed?
2. **Input** — Can untrusted input reach dangerous operations?
3. **Authentication** — Is identity verified where required?
4. **Authorization** — Can a user/service access more than intended?
5. **Data** — Is sensitive data stored, transmitted, and logged safely?
6. **Dependencies** — Does the change introduce unnecessary or vulnerable dependencies?
7. **Infrastructure** — Does the change increase network exposure or cloud permissions?
8. **Regression** — Does the change weaken an existing security control?

If a security issue is discovered, fix it as part of the task when it is within scope. If it cannot be safely fixed without changing the intended behavior or scope, clearly report the issue instead of silently ignoring it.

A task must not be reported as complete while a known critical security issue introduced by the change remains unresolved.
