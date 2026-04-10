# Contributing Guide

## Branching & Environments
- Base branch for all specs: `develop`
- Merge order: `develop` → `preview` → `master`
- Vercel:
  - `preview` → `pre-kanban-pro.vercel.app`
  - `master` → `kanban-pro.vercel.app`

## Versioning (Semantic Release)
We use **Semantic Release** with Conventional Commits:
- `feat:` → **minor** (Y)
- `fix:` → **patch** (Z)
- `feat!` or `BREAKING CHANGE` → **major** (X)

Examples:
```
feat: add company dashboard
fix: menu alignment
feat!: redesign navigation
```

## Commit Template
Use the template in `docs/COMMIT_TEMPLATE.md`.
Optional local config:
```
git config commit.template docs/COMMIT_TEMPLATE.md
```

## Quality Gates
Run before pushing:
```
npm run check
npm run test:e2e
```

## E2E Authenticated Tests (Optional)
Some tests require authenticated state and data.

Provide these env vars:
- `E2E_AUTH_STORAGE` → path to Playwright storage state file
- `E2E_COMPANY_CODE` → company code to open `/empresa/:companyCode`

If not set, authenticated tests are **skipped**.

### Generate storage state (manual login)
1. Start the app locally:
```
npm run dev
```
2. In another terminal, run:
```
E2E_BASE_URL=http://127.0.0.1:5173 E2E_AUTH_STORAGE=e2e/.auth/storage.json npm run e2e:auth
```
3. Complete login in the opened browser window, then press **ENTER** in the terminal.
4. Use the file for authenticated tests:
```
E2E_AUTH_STORAGE=e2e/.auth/storage.json E2E_COMPANY_CODE=<COMPANY_CODE> npm run test:e2e
```
