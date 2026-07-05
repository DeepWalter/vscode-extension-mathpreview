/** The kind of formula delimiter that was matched */
export type FormulaKind = 'inline-latex' | 'display-latex' | 'rst-block' | 'rst-inline';

/** A matched formula within text */
export interface FormulaMatch {
	/** Which kind of formula delimiter was matched */
	kind: FormulaKind;
	/** The LaTeX source between delimiters, trimmed */
	formula: string;
	/** Index into the original text where the match starts */
	startIndex: number;
	/** Index into the original text where the match ends (past last char) */
	endIndex: number;
	/** The full matched string including delimiters (e.g. "$x^2$") */
	raw: string;
	/** Whether this should render in display-style */
	display: boolean;
}
