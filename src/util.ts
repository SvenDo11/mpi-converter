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