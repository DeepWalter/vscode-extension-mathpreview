# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (recompile on changes)
npm run watch

# Lint
npm run lint

# Run tests (compile + lint first, then integration test)
npm test
```

## Architecture

This is a standard VS Code extension scaffolded from the Yeoman generator. The extension contributes one command (`mathpreview.helloWorld`) that shows an information message.

- **Entry point:** [src/extension.ts](src/extension.ts) — `activate()` registers commands and `deactivate()` cleans up. The `main` field in [package.json](package.json) points to `./out/extension.js` (compiled output).
- **Tests:** [src/test/extension.test.ts](src/test/extension.test.ts) — VS Code integration tests run via `@vscode/test-cli` + `@vscode/test-electron`. Test files are compiled to `out/test/` and executed by the test runner configured in [.vscode-test.mjs](.vscode-test.mjs).
- **Packaging:** [.vscodeignore](.vscodeignore) excludes source files and config from the published `.vsix` package.
