// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { replacer } from './replaceme';
import { ToUnblocking } from './toUnblocking';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "mpiconv" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('mpiconv.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello VS-Code! ;)');
	});

	let timemsg = vscode.commands.registerCommand('mpiconv.tellTime', () => {
		let datetime = new Date();
		vscode.window.showInformationMessage('Current time is: ' + datetime.toString());
	});

	let replaceme = vscode.commands.registerCommand('mpiconv.replaceMe', () => {
		replacer();
	});

	let convertToUnblocking = vscode.commands.registerCommand('mpiconv.convertToUnblocking', () => {
		let toUnblocker = new ToUnblocking();
		toUnblocker.main();
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(timemsg);
	context.subscriptions.push(replaceme);
	context.subscriptions.push(convertToUnblocking);
}

// This method is called when your extension is deactivated
export function deactivate() {}
