import * as vscode from 'vscode';
import type { FormulaMatch } from './types';

/**
 * Detects LaTeX and reStructuredText math formulas in text.
 *
 * Four patterns, applied in priority order with overlap protection:
 * 1. $$...$$  — display LaTeX
 * 2. $...$    — inline LaTeX
 * 3. .. math:: block — reStructuredText display
 * 4. :math:`...`     — reStructuredText inline
 */
export class FormulaDetector {

	/** Matches $$...$$ display math (multiline, non-greedy) */
	private readonly displayLatexRe = /\$\$([\s\S]*?)\$\$/g;

	/** Matches $...$ inline math (not $$) */
	private readonly inlineLatexRe = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g;

	/** Matches reStructuredText .. math:: block directive */
	private readonly rstBlockRe = /\.\.\s+math::\s*(\S[\s\S]*?)(?=\n\n|\n\.\.|$)/g;

	/** Matches reStructuredText :math:`...` inline role */
	private readonly rstInlineRe = /:math:`([^`]+)`/g;

	/**
	 * Find all math formulas in the given text.
	 */
	detect(text: string): FormulaMatch[] {
		const matches: FormulaMatch[] = [];
		const consumed: Array<[number, number]> = [];

		const addMatch = (
			kind: FormulaMatch['kind'],
			formula: string,
			start: number,
			end: number,
			raw: string,
			display: boolean,
		) => {
			if (consumed.some(([s, e]) => start < e && end > s)) {
				return;
			}
			consumed.push([start, end]);
			matches.push({ kind, formula, startIndex: start, endIndex: end, raw, display });
		};

		for (const m of text.matchAll(this.displayLatexRe)) {
			addMatch('display-latex', m[1].trim(), m.index!, m.index! + m[0].length, m[0], true);
		}

		for (const m of text.matchAll(this.inlineLatexRe)) {
			addMatch('inline-latex', m[1].trim(), m.index!, m.index! + m[0].length, m[0], false);
		}

		for (const m of text.matchAll(this.rstBlockRe)) {
			addMatch('rst-block', m[1].trim(), m.index!, m.index! + m[0].length, m[0], true);
		}

		for (const m of text.matchAll(this.rstInlineRe)) {
			addMatch('rst-inline', m[1].trim(), m.index!, m.index! + m[0].length, m[0], false);
		}

		return matches.sort((a, b) => a.startIndex - b.startIndex);
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
