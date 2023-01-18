import {
    window,
    Position,
    Range,
    Selection,
    TextEditorRevealType
} from "vscode";

import { confirmationDialog } from "./dialogs";

export class ToUnblocking {
  constructor() {}

  main(): void {
    this.replaceSend();
  }

  async replaceSend () {
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
      return -1;
    }

    const searchString = "MPI_Send"
    let codestr = activeEditor.document.getText();
    let lastIndex = 0;
    while (true) {
      let index = codestr.indexOf(searchString, lastIndex);
      if (index === -1) {
        break;
      }

      let position = activeEditor.document.positionAt(index);
      lastIndex = index + 1;

      let rep = new Range(
        position,
        new Position(position.line, position.character + searchString.length)
      );
      // Highlighting and revealing
      activeEditor.selection = new Selection(rep.start, rep.end);
      activeEditor.revealRange(rep, TextEditorRevealType.InCenter);
      let result = await confirmationDialog("Turn this statement into an unblocking one?");

      if (result) {
        window.showInformationMessage("Replacing!");
        activeEditor.edit((editBuilder) => {
          editBuilder.replace(rep, "Not working yet");
        });
      }
    }
  }
}
