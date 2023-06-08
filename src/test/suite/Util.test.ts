import * as assert from "assert";
import { after } from "mocha";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { Position } from "vscode";
import * as util from "../../util";

/* 
suite("ExtendOverlapWindow tests", () => {
    const Uri = vscode.Uri.file("../testFiles/ExtendOverlap.cpp");
    vscode.commands.executeCommand<vscode.TextDocumentShowOptions>(
        "vscode.open",
        Uri
    );

    test("Give Position before MPI_Finalize", () => {
        let result = util.extendOverlapWindow2(new Position(14, 5), ["arr"]);
        assert.strictEqual(result?.line, 16);
        assert.strictEqual(result.character, 5);
    });

    test("Give Position before end of domain Test", () => {
        let result = util.extendOverlapWindow2(new Position(30, 9), ["arr"]);
        assert.strictEqual(result?.line, 31);
        assert.strictEqual(result.character, 5);
    });

    test("Give Position before conflicting statement Test", () => {
        let result = util.extendOverlapWindow2(new Position(46, 9), ["arr"]);
        assert.strictEqual(result?.line, 50);
        assert.strictEqual(result.character, 9);
    });

    test("Give Position before subdomain Test", () => {
        let result = util.extendOverlapWindow2(new Position(66, 9), ["arr"]);
        assert.strictEqual(result?.line, 70);
        assert.strictEqual(result.character, 9);
    });

    //test("Give Position at eof Test", () => {});
});
*/
