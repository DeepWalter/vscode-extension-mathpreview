import * as vscode from 'vscode';
import { Resvg } from '@resvg/resvg-js';
import { FormulaDetector } from './formulaDetector';
import { MathRenderer } from './mathRenderer';
import { RenderCache } from './cache';

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
		const languages: string[] = vscode.workspace
			.getConfiguration('mathpreview')
			.get('languages', ['python']);
		if (!languages.includes(document.languageId)) {
			return undefined;
		}

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
		const cacheKey = this.cache.makeKey(formula, fm.display, dark);
		let dataUri = this.cache.get(cacheKey);

		if (!dataUri) {
			let svg: string;
			try {
				svg = this.renderer.render(formula, fm.display);
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
				const resvg = new Resvg(svg, {
					background: 'rgba(255, 255, 255, 0)',
					dpi: 384,
				});
				pngBuffer = resvg.render().asPng();
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
