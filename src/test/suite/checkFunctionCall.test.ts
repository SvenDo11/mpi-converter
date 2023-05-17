import * as assert from 'assert';
import { after } from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as util from '../../util';

suite("ContainsFunctionCalls tests", () => {
	const Uri = vscode.Uri.file("../testFiles/test.cpp");
	vscode.commands.executeCommand<vscode.TextDocumentShowOptions>("vscode.open",Uri);

	test("Basic Test", () => {
		let result = util.containsFunctionCalls(new vscode.Range(new vscode.Position(15, 0), new vscode.Position(17, 0)))
		assert.strictEqual(result, false);
	});
});