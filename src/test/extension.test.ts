import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

suite('Math Preview Extension Test Suite', () => {

	test('Extension should be activated', async () => {
		const ext = vscode.extensions.getExtension('mathpreview.mathpreview');
		assert.ok(ext, 'Extension not found');
		assert.strictEqual(ext.isActive, true, 'Extension should be active');
	});

	test('Configuration defaults', () => {
		const config = vscode.workspace.getConfiguration('mathpreview');
		assert.strictEqual(config.get('enabled'), true);
		assert.deepStrictEqual(config.get('languages'), ['python']);
		assert.strictEqual(config.get('sizeScale'), 1.0);
		assert.strictEqual(config.get('cacheSize'), 200);
	});

	test('Hover provider renders math for file-scheme documents', async function () {
		this.timeout(10000);
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-test-'));
		const tmpFile = path.join(tmpDir, 'test.py');
		fs.writeFileSync(tmpFile, 'x = 5\ny = "$x^2 + y^2$"\nz = 10\n');

		try {
			const uri = vscode.Uri.file(tmpFile);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);

			const position = new vscode.Position(1, 8);
			const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
				'vscode.executeHoverProvider',
				doc.uri,
				position,
			);

			assert.ok(hovers && hovers.length > 0, 'Should get hover results for file-scheme document');
			const mdContent = hovers[0].contents[0] as vscode.MarkdownString;
			assert.ok(mdContent.value.includes('data:image/png;base64,'),
				'Hover should contain a base64 PNG image');
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	test('Hover provider renders math for untitled-scheme documents', async function () {
		this.timeout(10000);

		const doc = await vscode.workspace.openTextDocument({
			language: 'python',
			content: '# comment\ny = "$E = mc^2$"\n',
		});
		await vscode.window.showTextDocument(doc);

		assert.strictEqual(doc.uri.scheme, 'untitled');

		const position = new vscode.Position(1, 8);
		const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
			'vscode.executeHoverProvider',
			doc.uri,
			position,
		);

		assert.ok(hovers && hovers.length > 0, 'Should get hover results for untitled document');
		const mdContent = hovers[0].contents[0] as vscode.MarkdownString;
		assert.ok(mdContent.value.includes('data:image/png;base64,'),
			'Hover should contain a base64 PNG image');
	});

	test('Hover provider renders inline LaTeX delimiter \\(...\\)', async function () {
		this.timeout(10000);
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-test-'));
		const tmpFile = path.join(tmpDir, 'test.py');
		fs.writeFileSync(tmpFile, 'x = 5\ny = "\\(x^2 + y^2\\)"\nz = 10\n');

		try {
			const uri = vscode.Uri.file(tmpFile);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);

			const position = new vscode.Position(1, 8);
			const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
				'vscode.executeHoverProvider',
				doc.uri,
				position,
			);

			assert.ok(hovers && hovers.length > 0, 'Should get hover results for \\(...\\) formula');
			const mdContent = hovers[0].contents[0] as vscode.MarkdownString;
			assert.ok(mdContent.value.includes('data:image/png;base64,'),
				'Hover should contain a base64 PNG image');
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});

	test('Hover provider renders display LaTeX delimiter \\[...\\]', async function () {
		this.timeout(10000);
		const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mp-test-'));
		const tmpFile = path.join(tmpDir, 'test.py');
		fs.writeFileSync(tmpFile, 'x = 5\ny = "\\[x^2 + y^2\\]"\nz = 10\n');

		try {
			const uri = vscode.Uri.file(tmpFile);
			const doc = await vscode.workspace.openTextDocument(uri);
			await vscode.window.showTextDocument(doc);

			const position = new vscode.Position(1, 8);
			const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
				'vscode.executeHoverProvider',
				doc.uri,
				position,
			);

			assert.ok(hovers && hovers.length > 0, 'Should get hover results for \\[...\\] formula');
			const mdContent = hovers[0].contents[0] as vscode.MarkdownString;
			assert.ok(mdContent.value.includes('data:image/png;base64,'),
				'Hover should contain a base64 PNG image');
		} finally {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		}
	});
});
