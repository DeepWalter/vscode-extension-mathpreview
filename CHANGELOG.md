# Change Log

All notable changes to the "mathpreview" extension will be documented in this file.

## [1.0.0] - 2026-07-03

- LaTeX math rendering in hover popups via MathJax + resvg
- Support for `$...$`, `$$...$$`, `.. math::`, and ``:math:`...` `` delimiters
- Dark, light, and high-contrast theme awareness (automatic color adaptation)
- Configurable language list (`mathpreview.languages`) and size scale (`mathpreview.sizeScale`, 0.25×–4×)
- LRU render cache with `Clear Render Cache` command
- Whitespace normalization for robust formula detection
