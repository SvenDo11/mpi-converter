import { getVSCodeDownloadUrl } from "@vscode/test-electron/out/util";
import {
    window,
    Position,
    Range,
    Selection,
    TextEditorRevealType,
    TextEditor
} from "vscode";

import { confirmationDialog, inputDialog } from "./dialogs";
import { MPI_SendType, MPI_RecvType} from "./statementsTypes";
import { sendToIsend, recvToIrecv, containsVariables, findDomain , extendOverlapWindow, extractParams, containsFunctionCalls} from "./util";
import { checkForLoop } from "./forloop";

abstract class BlockingToUnblocking<MPI_Type>{
  activeEditor: TextEditor | undefined = undefined;
  codestr: string = "";
  isLoop: boolean = false;

  blockingInst: MPI_Type | undefined;
  loopStr: string = "";
  loopCntStr = "N";
  loopIterator: string = "";

  constructor(public pos:number) {}

  abstract getInstruction(): MPI_Type;

  abstract getPrefixStr(): Promise<string>;
  abstract getSuffixStr(): string;
  abstract transformToUnblocking(): string;

  abstract getConflictVariableStr(): string[];

  async replace() {
    this.activeEditor = window.activeTextEditor;
    if (this.activeEditor === undefined) {
      return;
    }
    this.codestr = this.activeEditor.document.getText();
    this.blockingInst = this.getInstruction();

    let editorPos = this.activeEditor.document.positionAt(this.pos);

    let isForLoop = await checkForLoop(editorPos);
    this.isLoop = isForLoop instanceof Position;
    if(this.isLoop){
      this.loopStr = this.activeEditor.document.lineAt(isForLoop as Position).text;
      this.loopCntStr = await this.getLoopIterationCount();
      this.loopIterator = await this.getLoopIterator();
    }

    let indentation = this.activeEditor.document.lineAt(editorPos).text.slice(0, editorPos.character);
    let newLnStr = "\n" + indentation;
    let endSmt = this.codestr.indexOf(';', this.pos);
    let range = new Range(editorPos, this.activeEditor.document.positionAt(endSmt+1));

    let prefixStr = await this.getPrefixStr();
    let unblockingStr = this.transformToUnblocking();
    let suffixStr = this.getSuffixStr();

    if(!this.isLoop){
      let endSmt = this.codestr.indexOf(';', this.pos);
      let range = new Range(editorPos, this.activeEditor.document.positionAt(endSmt+1));

      await this.activeEditor.edit((editBuilder) => {
          editBuilder.replace(range, prefixStr +
            newLnStr + unblockingStr);
      });
      
      let endPos = range.end.translate(1);
      let waitPos = extendOverlapWindow(endPos, this.getConflictVariableStr());
      waitPos = await this.checkForFunctionConflict(new Range(endPos?endPos:editorPos, waitPos));

      await this.activeEditor.edit((editBuilder) => {
        editBuilder.insert(waitPos, indentation + suffixStr + "\n");
      });
    } else {
      await this.activeEditor.edit((editBuilder) => {
          editBuilder.replace(range, unblockingStr);
      });

      let prefixPos = (isForLoop instanceof Position) ? isForLoop : editorPos;
      let indentation = this.activeEditor.document.lineAt(prefixPos).text.slice(0, prefixPos.character);
      let newLnStr = "\n" + indentation;
      
      await this.activeEditor.edit((editBuilder) => {
          editBuilder.insert(prefixPos, prefixStr + newLnStr);
      });
      
      let endPos = findDomain(editorPos.translate(2))?.end?.translate(1);
      let waitPos = extendOverlapWindow(endPos?endPos:editorPos, this.getConflictVariableStr());
      waitPos = await this.checkForFunctionConflict(new Range(endPos?endPos:editorPos, waitPos));
      await this.activeEditor.edit((editBuilder) => {
        editBuilder.insert(waitPos, suffixStr);
      });
    }
  }

  async checkForFunctionConflict(range: Range){
      if(this.activeEditor === undefined) {
        return range.end;
      }
      let functions = containsFunctionCalls(range);
      let waitPos = range.end;
      for(let i = 0; i < functions.length; i += 1) {
        // TODO: get a better message here!
        let func = functions[i];
        this.activeEditor.selection = new Selection(func.location.start, func.location.end);
        this.activeEditor.revealRange(func.location, TextEditorRevealType.InCenter);
        let result = await confirmationDialog("Does function '" + func.name + "' have a datarace with the buffer variable?")
        if( result ) {
          waitPos = func.location.start;
          break;
        }
      }
      return waitPos;
  }

  async getLoopIterationCount(): Promise<string> {
    let loopParams = extractParams(this.loopStr, 0, ';');
    let cntPreview = "";
    if(loopParams.length === 3){
      let comp = loopParams[1].split(/<|>|==|!=|<=|>=|<=>/);
      if(comp.length === 2) {
        let lhs = loopParams[0].split('=')[0].split(' ');
        let iterator = lhs.length == 1 ? lhs[0] : lhs[1];
        cntPreview = containsVariables(comp[0], [iterator]) ? comp[1] : comp[0];
      }
    }
    let cntString = await inputDialog("Enter number of loop iterations:", cntPreview,
      "You can enter a specific number, a variable name or a c++ expression to determine the loop iterations. Most of the time the correct statement is written in the for loop parameters.");
    if( cntString === undefined ) {
      window.showErrorMessage("Without a valid amount of loop iterations, the loop cannot be correctly unrolled. Please edit the array size manualy!");
      cntString = "/* MISSING SIZE */";
    }
    return cntString;
  }

  async getLoopIterator(): Promise<string> {
    let loopParams = extractParams(this.loopStr, 0, ';');
    let iteratorpreview = "";
    if(loopParams.length === 3){
      let lhs = loopParams[0].split('=')[0].split(' ');
      iteratorpreview = lhs.length == 1 ? lhs[0] : lhs[1];
    }

    let iteratorString = await inputDialog("Enter loop iterator:", iteratorpreview,
                              "You need to provide a iterator for the request and status variables of the MPI unblocking operation. In most cases this is the for loop iterator.");
    if( iteratorString === undefined ) {
      window.showErrorMessage("Without a valid loop iterator, the loop cannot correctly execute the MPI statements. Please edit the iterator manualy!");
      iteratorString = "/* MISSING SIZE */";
    }
    return iteratorString;
  }
}

class SendConverter extends BlockingToUnblocking<MPI_SendType> {
  getInstruction(): MPI_SendType {
    let params = extractParams(this.codestr, this.pos);

    if(params.length !== 6) {
      throw new Error("Did not get the appropriate amount of parameters from function. Expected 6 but got " + params.length + "!");
    }
    let sendSmt: MPI_SendType = {
      buf:    params[0],
      count:  params[1],
      datatype: params[2],
      dest:   params[3],
      tag:    params[4],
      comm:   params[5]
    };
    return sendSmt;
  }

  async getPrefixStr(): Promise<string> {
    // TODO: get status and request variable names.
    let statusStr = "MPI_Status status;";
    let requestStr = "MPI_Request request;";
    if(this.isLoop) {
      // TODO: get the righthandside of the loop iterations
      statusStr = "MPI_Status status["+ this.loopCntStr +"];";
      requestStr = "MPI_Request request["+ this.loopCntStr +"];";
    }
    return statusStr + "\n" + requestStr;
  }

  getSuffixStr(): string {
    let waitStr = "MPI_Wait(&request, &status);";
    if(this.isLoop){
      waitStr = "MPI_Waitall(" + this.loopCntStr + ", request, status);";
    }
    return waitStr;
  }
  
  transformToUnblocking(): string {
    if(this.blockingInst === undefined) {
      throw new Error("Blocking instruciton not set!");
    }
    return sendToIsend(this.blockingInst, this.isLoop ? "request[" + this.loopIterator + "]" : "request");
  }

  getConflictVariableStr(): string[] {
    if(this.blockingInst === undefined) {
      throw new Error("Blocking instruciton not set!");
    }
    return [this.blockingInst.buf];
  }
}

class RecvConverter extends BlockingToUnblocking<MPI_RecvType> {
  getInstruction(): MPI_RecvType {
    let params = extractParams(this.codestr, this.pos);

    if(params.length !== 7) {
      throw new Error("Did not get the appropriate amount of parameters from function. Expected 7 but got " + params.length + "!");
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
    return recvSmt;
  }

  async getPrefixStr(): Promise<string> {
    let requestStr = "MPI_Request request;";
    if(this.isLoop) {
      //TODO: get the righthandside of the loop iterations
      this.loopCntStr = await this.getLoopIterationCount();
      requestStr = "MPI_Request request[" + this.loopCntStr + "];";
    }
    return requestStr;
  }
  getSuffixStr(): string {
    let waitStr = "MPI_Wait(&request, &"+ this.blockingInst?.status +");";
    if(this.isLoop){
      waitStr = "MPI_Waitall(" + this.loopCntStr + ", request, " + this.blockingInst?.status +");";
    }
    return waitStr;
  }
  transformToUnblocking(): string {
    if(this.blockingInst === undefined) {
      throw new Error("Blocking instruction not set!");
    }
    return recvToIrecv(this.blockingInst, this.isLoop ? "request[i]" : 
                      "request");
  }

  getConflictVariableStr(): string[] {
    if(this.blockingInst === undefined) {
      throw new Error("Blocking instruciton not set!");
    }
    return [this.blockingInst.buf, this.blockingInst.status];
  }  
}

export async function blockingToUnblockingMain() {
  let activeEditor = window.activeTextEditor;
  if (activeEditor === undefined) {
    return;
  }
  let searchStrings = ["MPI_Send", "MPI_Recv"];
  for(let i = 0; i < 2; i += 1) {
    let searchString = searchStrings[i];
    let lastIndex = 0;
    while (true) {
      let codestr = activeEditor.document.getText();
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
        if(i === 0) {
          let replacer = new SendConverter(index);
          await replacer.replace();
        } else {
          let replacer = new RecvConverter(index);
          await replacer.replace();
        }
      }
    }
  }
}