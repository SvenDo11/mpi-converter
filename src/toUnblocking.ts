import { getVSCodeDownloadUrl } from "@vscode/test-electron/out/util";
import { CharacterEncoding } from "crypto";
import { start } from "repl";
import { setFlagsFromString } from "v8";
import {
    window,
    Position,
    Range,
    Selection,
    TextEditorRevealType
} from "vscode";

import { confirmationDialog, inputDialog } from "./dialogs";
import { MPI_SendType, MPI_RecvType} from "./statementsTypes";
import { sendToIsend, recvToIrecv, containsVariables, findDomain } from "./util";
import { checkForLoop } from "./forloop";

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

    let editorPos = activeEditor.document.positionAt(pos);
    let isForLoop = await checkForLoop(editorPos);
    let indentation = activeEditor.document.lineAt(editorPos).text.slice(0, editorPos.character);
    let newLnStr = "\n" + indentation;
    let endSmt = codestr.indexOf(';', pos);
    let range = new Range(editorPos, activeEditor.document.positionAt(endSmt+1));

    if(!isForLoop){
      let statusStr = "MPI_Status status;";
      let requestStr = "MPI_Request request;";
      let iSendStr = sendToIsend(sendSmt, "request");
      let waitStr = "MPI_Wait(&request, &status);";

      let endSmt = codestr.indexOf(';', pos);
      let range = new Range(editorPos, activeEditor.document.positionAt(endSmt+1));

      await activeEditor.edit((editBuilder) => {
          editBuilder.replace(range, statusStr + newLnStr + requestStr +
            newLnStr + iSendStr);
      });
      
      let endPos = range.end.translate(1);
      let waitPos = extendOverlapWindow(endPos, [sendSmt.buf]);

      await activeEditor.edit((editBuilder) => {
        editBuilder.insert(waitPos, indentation + waitStr + "\n");
      });
    } else {
      let cntString = await inputDialog("Enter number of loop iterations:", undefined,
        "You can enter a specific number, a variable name or a c++ expression to determine the loop iterations. Most of the time the correct statement is written in the for loop parameters.");
      if( cntString === undefined ) {
        window.showErrorMessage("Without a valid amount of loop iterations, the loop cannot be correctly unrolled. Please edit the array size manualy!");
        cntString = "/* MISSING SIZE */";
      }
      let statusStr = "MPI_Status status["+cntString+"];";
      let requestStr = "MPI_Request request["+cntString+"];";
      let iSendStr = sendToIsend(sendSmt, "request[i]"); // TODO: change static i to actual iterator
      let waitStr = "MPI_Wait(&request[i], &status[i]);";

      await activeEditor.edit((editBuilder) => {
          editBuilder.replace(range, iSendStr);
      });

      let prefixPos = (isForLoop instanceof Position) ? isForLoop : editorPos;
      let loopStr = activeEditor.document.lineAt(prefixPos).text;
      let indentation = activeEditor.document.lineAt(prefixPos).text.slice(0, prefixPos.character);
      let newLnStr = "\n" + indentation;
      
      await activeEditor.edit((editBuilder) => {
          editBuilder.insert(prefixPos, statusStr + newLnStr + requestStr + newLnStr);
      });
      
      let endPos = findDomain(editorPos.translate(2))?.end?.translate(1);
      console.log("EndPos = "+endPos);
      let waitPos = extendOverlapWindow(endPos?endPos:editorPos, [sendSmt.buf]);

      await activeEditor.edit((editBuilder) => {
        editBuilder.insert(waitPos, loopStr + newLnStr + "{" + newLnStr + "	" + waitStr + newLnStr + "}\n");
      });
    }
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

    let editorPos = activeEditor.document.positionAt(pos);
    let isForLoop = await checkForLoop(editorPos);
    if(isForLoop){
      console.log("Works");
    }

    let requestStr = "MPI_Request request;";
    let iSendStr = recvToIrecv(recvSmt, "request");
    let waitStr = "MPI_Wait(&request, &" + recvSmt.status + ");";

    let indentation = activeEditor.document.lineAt(editorPos).text.slice(0, editorPos.character);
    let newLnStr = "\n" + indentation;

    let endSmt = codestr.indexOf(';', pos);
    let range = new Range(editorPos, activeEditor.document.positionAt(endSmt+1));

    await activeEditor.edit((editBuilder) => {
        editBuilder.replace(range, requestStr +
          newLnStr + iSendStr);
    });

    let endPos = range.end.translate(1);
    let waitPos = extendOverlapWindow(endPos, [recvSmt.buf, recvSmt.status]);

    await activeEditor.edit((editBuilder) => {
      editBuilder.insert(waitPos, indentation + waitStr + "\n");
    });

  }
}

function extendOverlapWindow(pos: Position, variableNames: Array<string>): Position {
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
      return pos;
    }

    let currentPos = pos.translate(1);

    // find domain
    let domain = findDomain(pos);
    if( domain === undefined)
      domain = new Range(activeEditor.document.positionAt(0), new Position(activeEditor.document.lineCount - 1, 1));

    // look for variables in statments
    let subdomaincnt = 0;
    let validPos = currentPos;
    while(true) {
      if(!domain.contains(currentPos)) break;

      let line = activeEditor.document.lineAt(currentPos).text;

      if(line.indexOf("{") !== -1) {
        if(subdomaincnt == 0 && line.trim()[0] == "{") {
          while(true){
            let line = activeEditor.document.lineAt(validPos.line);
            if(line.isEmptyOrWhitespace || line.text.trimEnd().endsWith(";")){
              validPos = new Position(validPos.line + 1, 0);
              break;
            }
            validPos = validPos.translate(-1);
          }
        }
        subdomaincnt++;
      }
      if(line.indexOf("}") !== -1) subdomaincnt--;

      // check for variables
      if (containsVariables(line, variableNames)) {
        window.showInformationMessage("Found conflict in line " + (currentPos.line+1));
        break;
      }

      currentPos = currentPos.translate(1);
      if( subdomaincnt == 0) validPos = currentPos;
    }
    return new Position(validPos.line, 0);
}
        