import { MPI_SendType, MPI_RecvType } from "./statementsTypes";

import {window, Position, Range} from 'vscode';

export function sendToIsend(sendSmt: MPI_SendType, requestName:string): string {
    let outstr = "MPI_Isend(";
    outstr += sendSmt.buf + ", ";
    outstr += sendSmt.count + ", ";
    outstr += sendSmt.datatype + ", ";
    outstr += sendSmt.dest + ", ";
    outstr += sendSmt.tag + ", ";
    outstr += sendSmt.comm + ", ";
    outstr += "&" + requestName + ");"

    return outstr;
}

export function recvToIrecv(sendSmt: MPI_RecvType, requestName:string): string {
    let outstr = "MPI_Irecv(";
    outstr += sendSmt.buf + ", ";
    outstr += sendSmt.count + ", ";
    outstr += sendSmt.datatype + ", ";
    outstr += sendSmt.source + ", ";
    outstr += sendSmt.tag + ", ";
    outstr += sendSmt.comm + ", ";
    outstr += "&" + requestName + ");";

    return outstr;
}

export function containsVariables(line: string, variableNames: Array<string>): boolean {
  //line = line.replace(/\s/g, "");
  line = line.trim();
  let statments = line.split(/ |,|\(|\)|\{|\}|;|=|\/|\+|\-|\*|\[|\]/);
  let found = false;
  for(let i = 0; i < statments.length; i++) {
    variableNames.forEach(element => {
      if(statments[i] === element) {
        found = true;
      }
    });
  }
  return found;
}

export function findDomain(pos: Position) {
  let activeEditor = window.activeTextEditor;
  if (activeEditor === undefined) {
    return;
  }

  let domain = [pos, pos];
  let offset = [1, -1];
  let openDomain = ['{', '}'];
  let closeDomain = ['}', '{'];
  for(let round = 0; round <= 1; round++) {
    let subdomaincnt = 0;
    let currentPos = pos;
    while(true) {
      let line = activeEditor.document.lineAt(currentPos).text;
      let found = false;
      for( let i = 0; i < line.length; i++) {
        let c = line.charAt(i);
        if( c === openDomain[round]) {
          subdomaincnt++;
        }
        if( c === closeDomain[round]) {
          if(subdomaincnt === 0){
            domain[round]= new Position(currentPos.line, i);
            found = true;
            break;
          } else {
            subdomaincnt--;
          }
        }
      }
      if( found ) {
        break;
      }
      currentPos = currentPos.translate(offset[round]);
    }
  }

  let range = new Range(domain[1], domain[0]);

  return range;
}

export function extractParams(codestr:string, pos:number, splitChar: string = ','): string[] {
  let beginParams = codestr.indexOf('(', pos);
  let endParams = codestr.indexOf(')', pos);
  if(beginParams === -1 || endParams === -1 || beginParams >= endParams) {
    return [];
  }
  let paramstr = codestr.slice(beginParams+1, endParams);
  let params = paramstr.split(splitChar);
  return params;
}

export function extendOverlapWindow(pos: Position, variableNames: Array<string>): Position {
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
        break;
      }

      currentPos = currentPos.translate(1);
      if( subdomaincnt == 0) validPos = currentPos;
    }
    return new Position(validPos.line, 0);
}