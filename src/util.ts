import { MPI_SendType, MPI_RecvType } from "./statementsTypes";

import {window, Position, Range, TextEditor, ProcessExecutionOptions} from 'vscode';
import { BroadcastChannel } from "worker_threads";

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

  let beginParams = -1;
  let endParams = -1;
  let currentPos = pos;
  let subdomaincnt = 0;
  let mode = 0;
  while(true) {
    let char = codestr.charAt(currentPos);
    switch(mode) {
      case 0:
        // Find first open parenthesis
        if(char === '(') {
          beginParams = currentPos;
          mode = 1;
        }
        break;
      case 1:
        if(char === ')') {
          endParams = currentPos;
          mode = 3;
        }
        if(char === '(') {
          subdomaincnt = 1;
          mode = 2;
        }
        break;
      case 2:
        if(char === ')') {
          subdomaincnt -= 1;
          if(subdomaincnt === 0) {
            mode = 1;
          }
        }
        if(char === '(') {
          subdomaincnt += 1;
        }
        break;
      default:
        mode = 0;
        break;
    }
    if(mode === 3){
      break;
    }
    currentPos += 1;
    if(currentPos >= codestr.length){
      break;
    }
  }
  
  if(beginParams === -1 || endParams === -1 || beginParams >= endParams) {
    return [];
  }
  let paramstr = codestr.slice(beginParams+1, endParams);
  let params = paramstr.split(splitChar);

  for( let i = 0; i < params.length; i += 1) {
    params[i] = params[i].trim();
  }
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
    if( domain === undefined) {
      domain = new Range(activeEditor.document.positionAt(0), new Position(activeEditor.document.lineCount - 1, 1));
    }
    // look for variables in statments
    let subdomaincnt = 0;
    let validPos = currentPos;
    while(true) {
      if(!domain.contains(currentPos)) break;

      let line = activeEditor.document.lineAt(currentPos).text;

      if(line.indexOf("{") !== -1) {
        if(subdomaincnt === 0 && line.trim()[0] === "{") {
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


interface functionConflict {
  name: String,
  location: Range, 
  subdomainPos?: Position
}

// TODO: Fix \t tabs as possible letters, maybe by trimming
// TODO: Fix function in subdomain error
// TODO: last valid position should be befor for/while/if statement
export function containsFunctionCalls(range: Range): functionConflict[] {
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
      return [];
    }

    let currentPos = range.start;
    let lastvalidPos = currentPos;
    let subdomain = 0;
    let conflictFunctions: functionConflict[] = [];
    while(true){
      let line = activeEditor.document.lineAt(currentPos);
      if(!line.isEmptyOrWhitespace) {
        let lineTxt = line.text;
        let bracketPos = 0;
        subdomain += subDomainChangeInLine(lineTxt);
        while(true) {
          bracketPos = lineTxt.indexOf("(", bracketPos+1);
          if(bracketPos === -1) {
            break;
          }
          let charPos = bracketPos-1;
          while(true) {
            if(lineTxt.charAt(charPos) !== " " || charPos === 0){
              break;
            }
            charPos -= 1;
          }
          if(lineTxt.charAt(charPos).match(/\w/) !== null) {
            // Found a function
            let startCharPos =  charPos-1;
            while(true) {
              if(lineTxt.charAt(startCharPos).match(/\w/) !== null && startCharPos > 0){
                startCharPos -= 1;
              }
              else {
                break;
              }
            }
            conflictFunctions.push({name: lineTxt.substring(startCharPos+1, charPos+1),
                                    location: new Range(new Position(currentPos.line, startCharPos+1),
                                                        new Position(currentPos.line, charPos+1)),
                                    subdomainPos: (subdomain === 0) ? undefined : lastvalidPos});
          }
        } 
      }
      if(currentPos.line === range.end.line) {
        break;
      } 
      currentPos = currentPos.translate(1);
      if(subdomain === 0) {
        lastvalidPos = currentPos;
      }
    }

    return conflictFunctions;
}

export function subDomainChangeInLine(line: string): number {
  let dif = 0;
  let id = 0;
  while(id !== -1){
    id = line.indexOf('{', id);
    if(id !== -1){
      dif += 1;
      id += 1;
    } 
  }
  id = 0;
  while(id !== -1){
    id = line.indexOf('}', id);
    if(id !== -1){
      dif -= 1;
      id += 1;
    } 
  }
  return dif;
}