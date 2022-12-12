import {
  window,
  Position,
  Range,
  TextEditorEdit,
  QuickPickOptions,
  Selection,
} from "vscode";

const yesStrings = ["yes", "ja", "y", "1"];

async function confirmationDialog() {
  let i = 0;
  let result = await window.showQuickPick(["yes", "no"], <QuickPickOptions>{
    placeHolder: "Replace this?",
    onDidSelectItem: (item) =>
      window.showInformationMessage(`Focus ${++i}: ${item}`),
  });
  if (result !== undefined) {
    // check for string validity
    if (yesStrings.includes(result)) {
      window.showInformationMessage("returning true");
      return true;
    }
    return false;
  }
}

export async function replacer() {
  let activeEditor = window.activeTextEditor;
  if (activeEditor === undefined) {
    return;
  }

  const searchString = "// REPLACEME";
  const replaceString = "// Replaced!";

  let codestr = activeEditor.document.getText();
  let positions: Position[] = [];
  let lastIndex = 0;
  while (true) {
    let index = codestr.indexOf(searchString, lastIndex);
    if (index === -1) {
      break;
    }
    positions = positions.concat(activeEditor.document.positionAt(index));
    lastIndex = index + 1;
    console.log("Found string at postion " + index);
  }

  for(let i = 0; i < positions.length; i++){
	let value = positions[i];
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
      return;
    }

    let rep = new Range(
      value,
      new Position(value.line, value.character + searchString.length)
    );
    activeEditor.selection = new Selection(rep.start, rep.end);
    let result = await confirmationDialog();

    if (result) {
      window.showInformationMessage("Replacing!");
      activeEditor.edit((editBuilder) => {
        editBuilder.replace(rep, replaceString);
      });
    }
  }
}
