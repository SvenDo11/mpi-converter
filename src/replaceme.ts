import {
  window,
  Position,
  Range,
  TextEditorEdit,
  QuickPickOptions,
  Selection,
  TextEditorRevealType
} from "vscode";

import { confirmationDialog } from "./dialogs";

export async function replacer() {
  let activeEditor = window.activeTextEditor;
  if (activeEditor === undefined) {
    return;
  }

  const searchString = "// REPLACEME";
  const replaceString = "// Replaced!";

  // Finding the  positions of the strings to replace
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

  // User permited replacing
  for(let i = 0; i < positions.length; i++){
	let value = positions[i];
    let rep = new Range(
      value,
      new Position(value.line, value.character + searchString.length)
    );
    // Highlighting and revealing
    activeEditor.selection = new Selection(rep.start, rep.end);
    activeEditor.revealRange(rep, TextEditorRevealType.InCenter);
    let result = await confirmationDialog("Replace this?");

    if (result) {
      window.showInformationMessage("Replacing!");
      activeEditor.edit((editBuilder) => {
        editBuilder.replace(rep, replaceString);
      });
    }
  }
}
