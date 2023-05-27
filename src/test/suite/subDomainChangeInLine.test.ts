import * as assert from 'assert';
import { after } from 'mocha';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as util from '../../util';

const testLine = "This is a test { that should return 0 }";
const testLine2 = "This is another { test } with 1 { to much";
const testLine3 = "This has way to many {: {{{{ {{{ } {{{{";

suite("subDomainChangeInLine tests", () => {
	test("Basic Test", () => {
		let result = util.subDomainChangeInLine(testLine);
		assert.strictEqual(result, 0);
		result = util.subDomainChangeInLine(testLine2);
		assert.strictEqual(result, 1);
		result = util.subDomainChangeInLine(testLine3);
		assert.strictEqual(result, 11);
	});
});