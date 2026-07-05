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

A VS Code extension that renders LaTeX math formulas as images in hover popups. Works with any language (configurable via `mathpreview.languages`, defaults to `python`).

### Pipeline

```
Hover over formula → detectAtPosition() → normalize whitespace
→ MathJax (TeX→SVG) → resvg (SVG→PNG) → data:image/png;base64
→ <img> in MarkdownString with supportHtml
```

### Source files

| File | Purpose |
| --- | --- |
| [src/extension.ts](src/extension.ts) | Entry point. Registers hover provider for all `file`-scheme documents, filters by configured language IDs at runtime. |
| [src/hoverProvider.ts](src/hoverProvider.ts) | `MathPreviewHoverProvider` — core provider: checks language, detects formula at cursor position, normalizes whitespace, renders via MathJax+resvg, caches PNG data URIs. |
| [src/formulaDetector.ts](src/formulaDetector.ts) | `FormulaDetector` — 4 regex patterns + position-aware `detectAtPosition()` that scans a 5-line window around the cursor. |
| [src/mathRenderer.ts](src/mathRenderer.ts) | `MathRenderer` — wraps `mathjax-full` with `liteAdaptor`, renders LaTeX to bare `<svg>` strings. |
| [src/cache.ts](src/cache.ts) | `RenderCache` — LRU cache for final PNG data URIs, keyed by formula + display mode + dark/light theme. |
| [src/types.ts](src/types.ts) | `FormulaMatch` interface. |

### Dependencies

- **`mathjax-full`** — LaTeX → SVG rendering in Node.js (liteAdaptor)
- **`@resvg/resvg-js`** — WASM-based SVG → PNG conversion (no native deps)

### Key design decisions

- **No provider interception** — reads raw source text at cursor position, not Pyright hover output. Independent of any Python extension.
- **PNG data URIs** (`data:image/png;base64,...`) — only image format that works in VS Code hover popups. SVG data URIs, file URIs, and custom URI schemes are all blocked by CSP.
- **Dark theme adaptation** — injects `color: #e0e0e0` into the MathJax SVG `style` attribute for dark/high-contrast themes (MathJax uses `currentColor` for text).
- **Error detection** — MathJax renders `<merror>` elements for broken LaTeX (doesn't throw). Provider checks for `data-mjx-error` in SVG output and shows a fallback hover with the raw formula text.
- **Whitespace normalization** — collapses whitespace, removes cosmetic spaces around operators/brackets, and strips spaces before `\` commands. Preserves spaces after command names — `\sum a` is not the same as `\suma`.
- **`onStartupFinished` activation** — activates on startup so it's ready for any file type. Language filtering happens at runtime via config.

### Configuration

```json
{
  "mathpreview.enabled": true,
  "mathpreview.languages": ["python"],
  "mathpreview.cacheSize": 200
}
```

### Testing

Tests run via `@vscode/test-cli` + `@vscode/test-electron`. The existing test in [src/test/extension.test.ts](src/test/extension.test.ts) is a placeholder. To test manually: press F5 (Run Extension), open a file with LaTeX formulas, and hover over a formula.
