# Math Preview

Render LaTeX math formulas as crisp images in VS Code hover popups. Works with any language — just hover over a formula and see it rendered instantly.

## Features

- **Hover to preview** — hover over any LaTeX math formula in your source code and see it rendered as a high-resolution image in the hover popup.
- **Language-agnostic** — works with Python, Markdown, LaTeX, R, or any language you configure. Detects formulas directly from the source text.
- **Display & inline math** — supports both `$$...$$` (display) and `$...$` (inline) LaTeX delimiters, plus reStructuredText `.. math::` and ``:math:`...` ``.
- **Dark theme aware** — automatically adjusts formula color for dark, light, and high-contrast themes.
- **Configurable size** — scale rendered formulas from 0.25× to 4× with the `mathpreview.sizeScale` setting. Changes apply instantly, no restart needed.
- **LRU caching** — caches rendered PNGs in memory for fast follow-up hovers. Configurable cache size.

## Requirements

No external dependencies beyond what ships with the extension. The extension bundles:

- [MathJax 3](https://www.mathjax.org/) for LaTeX → SVG rendering
- [resvg](https://github.com/yisibl/resvg-js) (WASM) for SVG → PNG conversion

Both are pure JavaScript/WASM — no native binaries or system libraries required.

## Extension Settings

This extension contributes the following settings:

| Setting | Type | Default | Description |
| --- | --- | --- | --- |
| `mathpreview.enabled` | `boolean` | `true` | Enable or disable math rendering in hover popups. |
| `mathpreview.languages` | `string[]` | `["python"]` | Language IDs for which math rendering is active (e.g. `"python"`, `"markdown"`, `"latex"`, `"r"`). |
| `mathpreview.sizeScale` | `number` | `1.0` | Scale factor for rendered formula size. Range: 0.25–4.0. Increase for larger popups, decrease for smaller. |
| `mathpreview.cacheSize` | `number` | `200` | Maximum number of rendered formulas to cache in memory. Requires restart to change. |

### Commands

- **Math Preview: Clear Render Cache** — clears the in-memory PNG cache. Useful if you change themes or want to force re-rendering.

## How It Works

```
Hover over formula → detect LaTeX at cursor position → normalize whitespace
→ MathJax (TeX → SVG) → resvg (SVG → PNG)
→ data:image/png;base64 → <img> in hover popup
```

The extension reads raw source text at the cursor position — it does not depend on or intercept any language server output. This means it works independently of whatever Python (or other language) extension you use.

## Known Issues

- Very long formulas may be clipped in the hover popup due to VS Code's hover size limits.
- `cacheSize` changes require a VS Code restart to take effect (all other settings apply immediately).

## Release Notes

### 0.1.0

- Initial release: LaTeX math rendering in hover popups via MathJax + resvg.
- Support for `$...$`, `$$...$$`, `.. math::`, and ``:math:`...` `` delimiters.
- Configurable language list and size scale.
- Dark/light/high-contrast theme support.
- LRU render cache with `Clear Render Cache` command.
- Fixed: sharpened rendered formulas with synchronized MathJax/resvg sizing.
