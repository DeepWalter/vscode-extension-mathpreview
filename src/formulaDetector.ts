import * as vscode from 'vscode';
import type { FormulaMatch } from './types';

/**
 * Detects LaTeX, TeX, and reStructuredText math formulas in text.
 *
 * Six patterns, applied in priority order with overlap protection:
 * 1. $$...$$  — display TeX
 * 2. \[...\]  — display LaTeX
 * 3. $...$    — inline TeX
 * 4. \(...\)  — inline LaTeX
 * 5. .. math:: block — reStructuredText display
 * 6. :math:`...`     — reStructuredText inline
 */
export class FormulaDetector {

	/** Matches $$...$$ display math (multiline, non-greedy) */
	private readonly displayTexRe = /\$\$([\s\S]*?)\$\$/g;

	/** Matches $...$ inline math (not $$) */
	private readonly inlineTexRe = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g;

	/** Matches \[...\] display math (multiline, non-greedy) */
	private readonly displayLatexRe = /(?<!\\)\\\[([\s\S]*?)\\\]/g;

	/** Matches \(...\) inline math */
	private readonly inlineLatexRe = /(?<!\\)\\\((.+?)\\\)/g;

	/** Matches reStructuredText .. math:: block directive */
	private readonly rstBlockRe = /\.\.\s+math::\s*(\S[\s\S]*?)(?=\n\n|\n\.\.|$)/g;

	/** Matches reStructuredText :math:`...` inline role */
	private readonly rstInlineRe = /:math:`([^`]+)`/g;

	/**
	 * Find all math formulas in the given text.
	 *
	 * Regexes are processed in priority order: display-tex > display-latex >
	 * inline-tex > inline-latex > rst-block > rst-inline. Higher-priority
	 * matches always take precedence over lower-priority ones when they
	 * overlap (regardless of position).
	 */
	detect(text: string): FormulaMatch[] {
		const consumed: Array<[number, number]> = [];
		const matches = [
			...this.collectMatches(text, this.displayTexRe, 'display-tex', true, consumed),
			...this.collectMatches(text, this.displayLatexRe, 'display-latex', true, consumed),
			...this.collectMatches(text, this.inlineTexRe, 'inline-tex', false, consumed),
			...this.collectMatches(text, this.inlineLatexRe, 'inline-latex', false, consumed),
			...this.collectMatches(text, this.rstBlockRe, 'rst-block', true, consumed),
			...this.collectMatches(text, this.rstInlineRe, 'rst-inline', false, consumed),
		];
		return matches.sort((a, b) => a.startIndex - b.startIndex);
	}

	/**
	 * Extract matches from `text` using `regex`, skipping any that overlap
	 * an already-consumed range. Consumed ranges track which spans of text
	 * are already claimed by higher-priority patterns.
	 */
	private collectMatches(
		text: string,
		regex: RegExp,
		kind: FormulaMatch['kind'],
		display: boolean,
		consumed: Array<[number, number]>,
	): FormulaMatch[] {
		const matches: FormulaMatch[] = [];
		for (const m of text.matchAll(regex)) {
			const start = m.index!;
			const end = start + m[0].length;
			if (consumed.some(([s, e]) => start < e && end > s)) {
				continue;
			}
			consumed.push([start, end]);
			matches.push({
				kind,
				formula: m[1].trim(),
				startIndex: start,
				endIndex: end,
				raw: m[0],
				display,
			});
		}
		return matches;
	}

	/**
	 * Check whether the given document position falls inside a formula.
	 * Multi-line block formulas ($$, .. math::) are detected by scanning
	 * a small window around the hover line.
	 *
	 * Returns the matched formula if the position is inside one, or undefined.
	 */
	detectAtPosition(
		document: vscode.TextDocument,
		position: vscode.Position,
	): FormulaMatch | undefined {
		// Build a multi-line window for block formulas:
		// lines before (for .. math:: start) to lines after (for closing $$/block end).
		const startLine = Math.max(0, position.line - 5);
		const endLine = Math.min(document.lineCount - 1, position.line + 5);
		const lines: string[] = [];
		for (let i = startLine; i <= endLine; i++) {
			lines.push(document.lineAt(i).text);
		}
		const blockText = lines.join('\n');

		// Offset to map match indices back to document positions
		const blockOffset = document.offsetAt(new vscode.Position(startLine, 0));
		const hoverOffset = document.offsetAt(position);

		const candidates = this.detect(blockText);

		for (const m of candidates) {
			const matchStart = blockOffset + m.startIndex;
			const matchEnd = blockOffset + m.endIndex;
			if (hoverOffset >= matchStart && hoverOffset <= matchEnd) {
				return m;
			}
		}

		return undefined;
	}
}
