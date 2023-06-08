import * as assert from "assert";
import { after } from "mocha";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import * as util from "../../util";

suite("ContainsFunctionCalls tests", () => {
    test("No function Test", () => {
        let result = util.containsFunctionCalls(
            "No function in this; but 1+1 = 2"
        );
        assert.strictEqual(
            result.length,
            0,
            "No parenthesis did not return 0 functions"
        );

        result = util.containsFunctionCalls(
            "No function in this either; let i = (1+1) * 2"
        );
        assert.strictEqual(
            result.length,
            0,
            "A paranthesis, thats not a function returned a function"
        );
    });

    test("Basic Test", () => {
        let result = util.containsFunctionCalls("func()");
        assert.strictEqual(
            result.length,
            1,
            "A function did not return exactly one function"
        );
        assert.strictEqual(
            result[0].name,
            "func",
            "The name of the returned function was incorrect"
        );

        result = util.containsFunctionCalls("another func ()");
        assert.strictEqual(
            result.length,
            1,
            "A function with a space did not return exactly one function"
        );
        assert.strictEqual(
            result[0].name,
            "func ",
            "The name of the returned function with a space was incorrect"
        );
    });

    test("multiple Test", () => {
        let names = ["if", "foo", "bar"];
        let result = util.containsFunctionCalls(
            "if(x>=2){foo(); } else { bar(); }"
        );
        assert.strictEqual(result.length, 3);
        for (let i = 0; i < names.length; i += 1) {
            assert.strictEqual(result[i].name, names[i]);
        }
    });

    test("edgecases Test", () => {
        let result = util.containsFunctionCalls("(Hello)");
        assert.strictEqual(
            result.length,
            0,
            "A string starting with parenthesis should not crash"
        );

        result = util.containsFunctionCalls("hey, we have a foo(");
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].name, "foo");
    });
});
