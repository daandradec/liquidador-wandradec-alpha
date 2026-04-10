# Repository Guidelines

## Project Structure & Module Organization
- `code/` contains the runnable app.
- `code/index.html` is the single-page entry point.
- `code/js/app.js` orchestrates UI state, forms, and exports.
- `code/js/engine/` contains pure liquidation logic (`liquidate.js`, `accruals.js`, `social-security.js`, etc.).
- `code/js/domain/` defines defaults and validators for employees, concepts, and novelties.
- `code/js/storage/repository.js` manages `localStorage` persistence and JSON import/export.
- `code/js/export/` contains CSV/XLSX/PDF exporters.
- `code/tests/run-tests.mjs` is the current unit test runner.
- `openspec/` and `specs/` store change/spec artifacts; keep implementation in `code/`.

## Build, Test, and Development Commands
Run from repository root unless noted.
- `npm start`: serves `./code` on `http://localhost:8080` using `http-server`.
- `cd code && npm run dev`: starts BrowserSync on port `4173` with live reload.
- `cd code && npm test`: executes `node ./tests/run-tests.mjs`.
- `cd code && npm start`: serves only the app folder on port `8080`.

## Coding Style & Naming Conventions
- Language: modern ES modules (`type: module` in `code/package.json`).
- Indentation: 2 spaces; include semicolon-free style consistent with existing files.
- Naming: `camelCase` for variables/functions, `UPPER_SNAKE_CASE` for constants (for example `TAB_ORDER`).
- File names use kebab-case in feature folders (for example `social-security.js`, `annual-parameters.js`).
- Keep engine modules pure and deterministic; avoid DOM access outside `app.js`/UI layers.

## Testing Guidelines
- Add tests in `code/tests/run-tests.mjs` using `node:assert/strict` and the `run("Caso …", fn)` pattern.
- Cover both nominal and edge cases for liquidation, bases, and indemnization calculations.
- Prefer small, explicit fixtures via `createBaseEmployee({...})` overrides.
- Run `cd code && npm test` before opening a PR.

## Commit & Pull Request Guidelines
- Follow Conventional Commit prefixes seen in history: `feat:`, `fix:`, `style:`, `refactor:`.
- Keep commits focused by concern (engine, UI, exports, tests).
- PRs should include:
  - concise description of behavior change,
  - linked issue/spec when applicable,
  - test evidence (`npm test` output),
  - screenshots/GIFs for UI changes (`code/index.html` flows).
