import * as vscode from 'vscode';
import { readFile } from 'node:fs/promises';
import { Resvg, initWasm } from '@resvg/resvg-wasm';
import { FormulaDetector } from './formulaDetector';
import { MathRenderer } from './mathRenderer';
import { RenderCache } from './cache';

let wasmReady: Promise<void> | null = null;

/** Initialize the resvg WASM module (idempotent — runs only once). */
function ensureWasm(): Promise<void> {
	if (!wasmReady) {
		const wasmPath = require.resolve('@resvg/resvg-wasm/index_bg.wasm');
		wasmReady = readFile(wasmPath).then((buf) => initWasm(buf));
	}
	return wasmReady;
}

export class MathPreviewHoverProvider implements vscode.HoverProvider {
	private readonly detector = new FormulaDetector();
	private readonly cache: RenderCache;

	constructor(
		private readonly renderer: MathRenderer,
		cacheSize: number = 200,
	) {
		this.cache = new RenderCache(cacheSize);
	}

	async provideHover(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CancellationToken,
	): Promise<vscode.Hover | undefined> {
		// Only process documents whose language ID is in the configured list
		const config = vscode.workspace.getConfiguration('mathpreview');
		const languages: string[] = config.get('languages', ['python']);
		if (!languages.includes(document.languageId)) {
			return undefined;
		}

		const sizeScale = config.get<number>('sizeScale', 1.0);

		const fm = this.detector.detectAtPosition(document, position);
		if (!fm) {
			return undefined;
		}

		if (token.isCancellationRequested) {
			return undefined;
		}

		const formula = fm.formula
			.replace(/\s+/g, ' ')
			.replace(/\s*([=+\-*/(){}^_,;:|<>.\[\]])\s*/g, '$1')
			.replace(/\s+(?=\\)/g, '')
			.trim();

		const dark = isDarkTheme();
		const cacheKey = this.cache.makeKey(formula, fm.display, dark, sizeScale);
		let dataUri = this.cache.get(cacheKey);

		if (!dataUri) {
			let svg: string;
			try {
				svg = this.renderer.render(formula, fm.display, sizeScale);
			} catch (err) {
				return this.fallbackHover(formula);
			}

			// MathJax doesn't throw on LaTeX errors — it renders a <merror>
			// element. Detect and show the fallback instead of a blank image.
			if (svg.includes('data-mjx-error')) {
				return this.fallbackHover(formula);
			}

			if (dark) {
				svg = svg.replace(/style="([^"]*)"/, 'style="$1; color: #e0e0e0;"');
			}

			let pngBuffer: Buffer;
			try {
				await ensureWasm();
				const resvg = new Resvg(svg, {
					background: 'rgba(255, 255, 255, 0)',
					font: {
						defaultFontSize: Math.round(18 * sizeScale),
					},
				});
				pngBuffer = Buffer.from(resvg.render().asPng());
			} catch (err) {
				return this.fallbackHover(formula);
			}

			dataUri = `data:image/png;base64,${pngBuffer.toString('base64')}`;
			this.cache.set(cacheKey, dataUri);
		}

		const altText = formula.replace(/"/g, '&quot;');
		const imgTag = fm.display
			? `<p align="center"><img src="${dataUri}" alt="${altText}" style="max-width:100%; height:auto" /></p>`
			: `<img src="${dataUri}" alt="${altText}" style="height:1.4em; vertical-align:middle" />`;

		const md = new vscode.MarkdownString('\n\n---\n\n' + imgTag);
		md.supportHtml = true;
		md.isTrusted = true;

		return new vscode.Hover(md);
	}

	private fallbackHover(formula: string): vscode.Hover {
		const md = new vscode.MarkdownString(
			'\n\n---\n\n*Failed to render:* `' + formula.replace(/`/g, '\\`') + '`',
		);
		md.isTrusted = true;
		return new vscode.Hover(md);
	}

	clearCache(): void {
		this.cache.clear();
	}
}

function isDarkTheme(): boolean {
	const theme = vscode.window.activeColorTheme;
	return theme.kind === vscode.ColorThemeKind.Dark
		|| theme.kind === vscode.ColorThemeKind.HighContrast;
}
