import {
    window,
    Position,
    Range,
    Selection,
    TextEditorRevealType
} from "vscode";

import { confirmationDialog } from "./dialogs";
import { MPI_SendType } from "./statementsTypes";
import { sendToIsend } from "./util";

export class ToUnblocking {
  constructor() {}

  main(): void {
    this.unblockingSend();
  }

  async unblockingSend() {
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
      return;
    }

    const searchString = "MPI_Send";
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
      let result = await confirmationDialog(
        "Turn this statement into an unblocking one?"
      );

      if (result) {
        window.showInformationMessage("Replacing!");
        this.replaceSend(codestr, index);
      }
    }
  }

  async replaceSend(codestr: string, pos: number) {
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
      return;
    }

    // find full statement
    let beginParams = codestr.indexOf('(', pos);
    let endParams = codestr.indexOf(')', pos);
    let endSmt = codestr.indexOf(';', pos);
    if(beginParams == -1 || endParams == -1 || beginParams >= endParams) {
      return;
    }

    let paramstr = codestr.slice(beginParams+1, endParams);
    let params = paramstr.split(',');
    if(params.length !== 6) {
      return;
    }
    let sendSmt: MPI_SendType = {
      buf:    params[0],
      count:  params[1],
      datatype: params[2],
      dest:   params[3],
      tag:    params[4],
      comm:   params[5]
    };

    let statusStr = "MPI_Status status;";
    let requestStr = "MPI_Request request;";
    let iSendStr = sendToIsend(sendSmt, "request");
    let waitStr = "MPI_Wait(&request, &status);";

    let editorPos = activeEditor.document.positionAt(pos);
    let newLnStr = activeEditor.document.lineAt(editorPos).text.slice(0, editorPos.character);
    newLnStr = "\n" + newLnStr;

    let range = new Range(editorPos, activeEditor.document.positionAt(endSmt+1));

    activeEditor.edit((editBuilder) => {
        editBuilder.replace(range, statusStr + newLnStr + requestStr +
          newLnStr + iSendStr + newLnStr + waitStr);
    });
  }
}
