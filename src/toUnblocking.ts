import { setFlagsFromString } from "v8";
import {
    window,
    Position,
    Range,
    Selection,
    TextEditorRevealType
} from "vscode";

import { confirmationDialog } from "./dialogs";
import { MPI_SendType, MPI_RecvType} from "./statementsTypes";
import { sendToIsend, recvToIrecv } from "./util";

export class ToUnblocking {
  constructor() {}

  async main(){
    await this.unblockingDialog();
    window.showInformationMessage("Done");
  }

  async unblockingDialog() {
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
      return;
    }
    let searchStrings = ["MPI_Send", "MPI_Recv"];
    for(let i = 0; i < 2; i += 1) {
      let searchString = searchStrings[i];
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
          if(i === 0) {
            await this.replaceSend(index);
          } else {
            await this.replaceRecv(index);
          }
        }
      }
    }
  }

  extractParams(codestr:string, pos:number): string[] {
    let beginParams = codestr.indexOf('(', pos);
    let endParams = codestr.indexOf(')', pos);
    if(beginParams === -1 || endParams === -1 || beginParams >= endParams) {
      return [];
    }
    let paramstr = codestr.slice(beginParams+1, endParams);
    let params = paramstr.split(',');
    return params;
  }

  async replaceSend(pos: number) {
    window.showInformationMessage("Got here");
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
      return;
    }
    let codestr = activeEditor.document.getText();
    let params = this.extractParams(codestr, pos);

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

    let endSmt = codestr.indexOf(';', pos);
    let range = new Range(editorPos, activeEditor.document.positionAt(endSmt+1));

    await activeEditor.edit((editBuilder) => {
        editBuilder.replace(range, statusStr + newLnStr + requestStr +
          newLnStr + iSendStr + newLnStr + waitStr);
    });
  }

  async replaceRecv(pos: number) {
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
      return;
    }

    let codestr = activeEditor.document.getText();
    let params = this.extractParams(codestr, pos);

    if(params.length !== 7) {
      return;
    }
    let recvSmt: MPI_RecvType = {
      buf:    params[0],
      count:  params[1],
      datatype: params[2],
      source:   params[3],
      tag:    params[4],
      comm:   params[5],
      status: params[6].replace('&', '').trim()
    };

    let requestStr = "MPI_Request request;";
    let iSendStr = recvToIrecv(recvSmt, "request");
    let waitStr = "MPI_Wait(&request, &" + recvSmt.status + ");";

    let editorPos = activeEditor.document.positionAt(pos);
    let newLnStr = activeEditor.document.lineAt(editorPos).text.slice(0, editorPos.character);
    newLnStr = "\n" + newLnStr;

    let endSmt = codestr.indexOf(';', pos);
    let range = new Range(editorPos, activeEditor.document.positionAt(endSmt+1));

    await activeEditor.edit((editBuilder) => {
        editBuilder.replace(range, requestStr +
          newLnStr + iSendStr + newLnStr + waitStr);
    });
  }
}

function extendOverlapWindow(pos: Position, bufferName: string) {
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
      return;
    }

    let currentPos = pos;
    
    while(true) {
      let line = activeEditor.document.lineAt(currentPos);
      // find the variable.
      if(line.text.indexOf(bufferName) !== -1) {
        break;
      }

      currentPos = currentPos.translate(1);
    }
}
