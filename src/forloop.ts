import { TextLine, Position, Range, window } from "vscode";
import { confirmationDialog } from "./dialogs";
import { containsVariables, findDomain } from './util';

const separators = [';', '}'];

export async function checkForLoop(pos: Position)
{
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
      return false;
    }
    let domain = findDomain(pos) || new Range(pos, pos.translate(1));

    let currentPos = domain.start;
    let isForLoop = false;
    // Itterate over previous lines to find statement bevor current domain
    while(true) {
        let line = activeEditor.document.lineAt(currentPos)
        if( line.isEmptyOrWhitespace ) {
            continue;
        }
        if(containsVariables(line.text, ['for'])){
            window.showInformationMessage("found this to be in a for loop");
            isForLoop = true;
            break;
        }
        if( line.text.includes(';') || line.text.includes('}') ) {
            isForLoop = false;
            break;
        }
        if(currentPos.line === 1) {
            break;
        }
        currentPos = currentPos.translate(-1);
    }

    if(isForLoop){
        if( await confirmationDialog("Is this mpi statement in a for loop, that can be unrolled?") ){
            return currentPos;
        }
    }
    return false;
}