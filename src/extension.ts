import * as vscode from 'vscode';
import { MathPreviewHoverProvider } from './hoverProvider';
import { MathRenderer } from './mathRenderer';

let mathRenderer: MathRenderer | undefined;
let hoverProvider: MathPreviewHoverProvider | undefined;

export function activate(context: vscode.ExtensionContext): void {
	const config = vscode.workspace.getConfiguration('mathpreview');
	if (!config.get<boolean>('enabled', true)) {
		console.log('[mathpreview] Extension is disabled by configuration.');
		return;
	}

	mathRenderer = new MathRenderer();

	const cacheSize = config.get<number>('cacheSize', 200);
	hoverProvider = new MathPreviewHoverProvider(mathRenderer, cacheSize);

	// Register for all document types — the provider checks the configured
	// language list internally so config changes apply immediately.
	context.subscriptions.push(
		vscode.languages.registerHoverProvider(
			{ scheme: 'file', language: '*' },
			hoverProvider,
		),
		vscode.languages.registerHoverProvider(
			{ scheme: 'untitled', language: '*' },
			hoverProvider,
		),
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('mathpreview.clearCache', () => {
			hoverProvider?.clearCache();
			vscode.window.showInformationMessage('Math Preview: render cache cleared.');
		}),
	);

	console.log('[mathpreview] Activated — math hover rendering ready.');
}

export function deactivate(): void {
	mathRenderer?.dispose();
	mathRenderer = undefined;
	hoverProvider = undefined;
}
