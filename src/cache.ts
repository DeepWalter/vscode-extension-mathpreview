/**
 * Simple LRU cache for rendered formula PNG data URIs.
 * Avoids the full MathJax + resvg pipeline on repeat hovers.
 */
export class RenderCache {
	private readonly cache = new Map<string, string>();
	private readonly maxSize: number;

	constructor(maxSize: number = 200) {
		this.maxSize = maxSize;
	}

	/** Build a cache key from formula text, display mode, dark theme flag, and scale */
	makeKey(formula: string, display: boolean, dark: boolean, scale: number = 1.0): string {
		return `${dark ? 'd' : 'l'}|${display ? 'D' : 'i'}|s${scale}|${formula}`;
	}

	get(key: string): string | undefined {
		const value = this.cache.get(key);
		if (value !== undefined) {
			// Move to end (most recently used)
			this.cache.delete(key);
			this.cache.set(key, value);
		}
		return value;
	}

	set(key: string, dataUri: string): void {
		// Delete first so updating an existing key promotes it to most-recently-used
		this.cache.delete(key);
		if (this.cache.size >= this.maxSize) {
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey !== undefined) {
				this.cache.delete(oldestKey);
			}
		}
		this.cache.set(key, dataUri);
	}

	clear(): void {
		this.cache.clear();
	}

	get size(): number {
		return this.cache.size;
	}
}
