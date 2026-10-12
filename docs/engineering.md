# Engineering standards

## Scope and architecture

Alt Air uses TypeScript strict mode, React, WXT, and Manifest V3.
Keep the extension local-first. Do not add backend or commercial modules until
their release scope is approved.

- `entrypoints/`: WXT document entrypoints and composition of each surface.
- `components/`: small shared React components, independent of browser APIs.
- `styles/`: shared styles and, later, design tokens.
- `lib/browser/`: browser API adapters. Do not import browser APIs in UI code.
- `features/<feature>/`: introduce when a real feature exists; keep its UI,
  domain behavior, and persistence separate. Do not create empty feature layers.
- `public/`: packaged static assets, including font licenses.
- Colocate `*.test.ts` with the behavior being tested.

Dependencies should flow from UI to feature behavior to browser/persistence
adapters. Keep domain rules as pure functions where practical. Use explicit
inputs and return types at module boundaries, and avoid `any`.
Do not add generic repositories, dependency-injection containers, or barrel files
unless a concrete use case warrants them.

ESLint enforces direct browser import/global restrictions in UI directories.
These checks are a guardrail; they do not replace review of dependency boundaries.

## Code and formatting

- English identifiers, filenames, and source comments; Persian product text.
- Components use PascalCase; other modules use descriptive kebab-case filenames.
- Hooks follow React's rules. Handle rejected promises and show useful UI errors.
- Use type-only imports and semantic HTML with visible keyboard focus.
- Prettier owns formatting. EditorConfig and Git attributes standardize UTF-8/LF.
- Preserve unmodified third-party assets and include their source and licenses.

## Validation

Use Node.js 24 and npm with the committed lockfile:

```sh
npm ci
npm run check
```

`check` runs formatting verification, ESLint, TypeScript, unit tests, and the
Chrome MV3 production build in sequence and fails on the first failing check.
Use `npm run format` to format and `npm run test:watch` during test development.

Vitest currently tests browser-adapter success/failure contracts with mocked
APIs. Add domain/persistence tests as those behaviors appear. Do not add tests
that merely restate CSS, markup, or implementation details.
UI/integration tests and test coverage targets will follow real feature work.

For UI changes, additionally inspect RTL, keyboard navigation, focus, readable
contrast, reduced motion, and narrow panel widths. Check the actual extension
in Chrome and Edge: a localhost preview cannot verify privileged browser APIs.

## Continuous integration

The GitHub Actions quality workflow runs `npm ci` and `npm run check` on pushes
and pull requests. It uses a read-only token and grants no deployment permission.
Its first remote execution requires committing and pushing the workflow.

## Dependency security

Run `npm audit` and `npm audit --omit=dev` when changing dependencies.
Review findings and compatible upgrades; never apply a breaking automatic fix.
Development findings are tracked in README.md, rather than silently ignored.
Do not put secrets into source, logs, test fixtures, or the repository.

## Workflow and acceptance

For each issue: inspect current code, present scope, implement it, run relevant
checks, review the diff, and report acceptance plus remaining risks.
Do not automatically start the next issue.
Commit, push, pull-request creation, and merge require user authorization.
