// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { replacer } from "./replaceme";
import { blockingToUnblockingMain } from "./toUnblocking";
import { getHelpHTML } from "./webviews";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "mpiconv" is now active!');

    let convertToUnblocking = vscode.commands.registerCommand(
        "mpiconv.convertToUnblocking",
        () => {
            blockingToUnblockingMain();
        }
    );

    let showHelp = vscode.commands.registerCommand("mpiconv.showHelp", () => {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            "MPIhelp",
            "MPI Converter Help",
            column || vscode.ViewColumn.One
        );

        panel.webview.html = getHelpHTML();
    });
    context.subscriptions.push(convertToUnblocking);
    context.subscriptions.push(showHelp);
    /*context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            "mpiconv.webview-view",
            new MPIConvViewProvider()
        )
    );*/
}

// This method is called when your extension is deactivated
export function deactivate() {}
