import { window, Position, Range, TextEditorEdit } from "vscode";

export async function showQuickPick() {
	let i = 0;
	const result = await window.showQuickPick(['eins', 'zwei', 'drei'], {
		placeHolder: 'eins, zwei or drei',
		onDidSelectItem: item => window.showInformationMessage(`Focus ${++i}: ${item}`)
	});
	window.showInformationMessage(`Got: ${result}`);
	return result;
}

export async function replacer(editBuilder: TextEditorEdit, rep: Range, newValue: string) {
	let editor = window.activeTextEditor;
	if (editor === undefined) {
		return;
	}
	editor.revealRange(rep); 
	let result = await showQuickPick();
	if ( result !== 'zwei') {
		editBuilder.replace(rep, newValue);
	}
}