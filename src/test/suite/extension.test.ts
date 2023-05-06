import * as assert from 'assert';
import { after } from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as util from '../../util';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});

	test('extractParams Test', () => {
		let teststring = "hello this is a test string.\n \
						There are some filler in here.\n \
						Statement(first, second);\n      \
						And more filler, thanks";
		let position = teststring.indexOf('Statement');
		let params = util.extractParams(teststring, position);
		assert.strictEqual(params.length, 2);
		assert.strictEqual(params[0], "first");
		assert.strictEqual(params[1], "second");
	});

	test('extractParams nested test', () => {
		let teststring = "hello this is a test string.\n \
						There are some filler in here.\n \
						Statement(first, second, (nested Third));\n      \
						And more filler, thanks";
		let position = teststring.indexOf('Statement');
		let params = util.extractParams(teststring, position);
		assert.strictEqual(params.length, 3);
		assert.strictEqual(params[0], "first");
		assert.strictEqual(params[1], "second");
		assert.strictEqual(params[2], "(nested Third)")
	});
});
