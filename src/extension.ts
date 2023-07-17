// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { blockingToUnblockingMain, convertStatement } from "./toUnblocking";
import { getHelpHTML } from "./webviews";
import { MPIStatementProvider, MPITreeItem } from "./mpiView";
import { runFormatter, gotoStatement } from "./util";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "mpiconv" is now active!');

    let convertToUnblocking = vscode.commands.registerCommand(
        "mpiconv.convertToUnblocking",
        () => {
            let promise = blockingToUnblockingMain();
            promise.then(() => {
                MPITreeProvider.refresh();
                runFormatter();
            });
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

    const MPITreeProvider = new MPIStatementProvider();

    let refreshTree = vscode.commands.registerCommand(
        "mpiconv.refreshTree",
        () => {
            MPITreeProvider.refresh();
        }
    );

    let convertSingle = vscode.commands.registerCommand(
        "mpiconv.convertElement",
        (elem: MPITreeItem) => {
            vscode.window
                .showTextDocument(elem.getEditor().document, {
                    preview: false,
                    preserveFocus: false,
                    viewColumn: elem.getEditor().viewColumn,
                })
                .then(() => {
                    let promise: Promise<void>;
                    if (elem.isFile()) {
                        promise = blockingToUnblockingMain();
                    } else {
                        promise = convertStatement(
                            elem.getEditor(),
                            elem.getPosition(),
                            elem.getType()
                        );
                    }
                    promise.then(() => {
                        MPITreeProvider.refresh();
                        runFormatter();
                    });
                });
        }
    );

    vscode.commands.registerCommand("mpiconv.gotoElement", (elem : MPITreeItem) => {
        if(elem.isFile()){
            return;
        }

        gotoStatement(elem.getEditor(), elem.getPosition());
    });

    context.subscriptions.push(convertToUnblocking);
    context.subscriptions.push(showHelp);
    context.subscriptions.push(refreshTree);

    vscode.window.registerTreeDataProvider(
        "mpiconv.mpiTreeView",
        MPITreeProvider
    );
    vscode.window.onDidChangeVisibleTextEditors((e) => {
        MPITreeProvider.refresh();
    });
}

// This method is called when your extension is deactivated
export function deactivate() {}
