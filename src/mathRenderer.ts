import { mathjax } from 'mathjax-full/js/mathjax';
import { TeX } from 'mathjax-full/js/input/tex';
import { SVG } from 'mathjax-full/js/output/svg';
import { LiteAdaptor } from 'mathjax-full/js/adaptors/liteAdaptor';
import { RegisterHTMLHandler } from 'mathjax-full/js/handlers/html';
import type { LiteElement } from 'mathjax-full/js/adaptors/lite/Element';
// mathjax-full's MathDocument type requires 3 generic params tied to DOM types;
// using `any` here sidesteps the complexity since we only call .convert() and
// access results through the liteAdaptor.
type MathDocument = any;

/**
 * Renders LaTeX formulas to SVG strings using MathJax v3 with the
 * lightweight DOM adaptor. Runs entirely in the extension host (Node.js) —
 * no browser or WebView needed.
 */
export class MathRenderer {
	private adaptor: LiteAdaptor;
	private htmlDocument: MathDocument;

	constructor() {
		this.adaptor = new LiteAdaptor();
		RegisterHTMLHandler(this.adaptor);

		const texInput = new TeX({
			packages: ['base', 'ams', 'newcommand'],
			inlineMath: [['$', '$'], ['\\(', '\\)']],
			displayMath: [['$$', '$$'], ['\\[', '\\]']],
			processEscapes: true,
		});

		const svgOutput = new SVG({
			fontCache: 'local',
			exFactor: 0.5,
			scale: 1.0,
		});

		this.htmlDocument = mathjax.document('', {
			InputJax: texInput,
			OutputJax: svgOutput,
		});
	}

	// Base em size before scale is applied
	private static readonly BASE_EM = 18;

	/**
	 * Render a LaTeX formula to a bare SVG string (no <mjx-container> wrapper).
	 * @param scale Size multiplier (1.0 = default).
	 */
	render(formula: string, display: boolean, scale: number = 1.0): string {
		const em = Math.round(MathRenderer.BASE_EM * scale);
		const rootNode = this.htmlDocument.convert(formula, {
			display,
			em,
			ex: Math.round(em / 2),
			containerWidth: Math.round(600 * scale),
		}) as LiteElement;

		// MathJax wraps SVG in <mjx-container> — extract just the <svg> child
		// so downstream tools like resvg receive a valid SVG document root.
		if (rootNode.children && rootNode.children.length > 0) {
			return this.adaptor.outerHTML(rootNode.children[0] as LiteElement);
		}
		return this.adaptor.outerHTML(rootNode);
	}

	dispose(): void {
		// liteAdaptor needs no cleanup
	}
}
