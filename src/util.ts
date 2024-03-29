import {
    MPI_SendType,
    MPI_RecvType,
    StatementType,
    MPI_ReduceType,
} from "./statementsTypes";

import {
    window,
    Position,
    Range,
    TextEditor,
    ProcessExecutionOptions,
    TextEditorRevealType,
    Selection,
    workspace,
    commands,
} from "vscode";
import { BroadcastChannel } from "worker_threads";
import { confirmationDialog } from "./dialogs";

let operators = / |,|.|:|\(|\)|\{|\}|;|=|<|>|\/|\+|\-|\*|\[|\]/;
let knownFunctions = [
    "for",
    "while",
    "if",
    "printf",
    "cout",
    "MPI_Send",
    "MPI_Isend",
    "MPI_Recv",
    "MPI_Wait",
    "MPI_Waitall",
];
let knownConflictFunctions = ["MPI_Finalize"];

export function sendToIsend(
    sendSmt: MPI_SendType,
    requestName: string
): string {
    let outstr = "MPI_Isend(";
    outstr += sendSmt.buf + ", ";
    outstr += sendSmt.count + ", ";
    outstr += sendSmt.datatype + ", ";
    outstr += sendSmt.dest + ", ";
    outstr += sendSmt.tag + ", ";
    outstr += sendSmt.comm + ", ";
    outstr += "&" + requestName + ");";

    return outstr;
}

export function recvToIrecv(
    sendSmt: MPI_RecvType,
    requestName: string
): string {
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

export function reduceToIreduce(
    reduceSmt: MPI_ReduceType,
    requestName: string
): string {
    let outstr = "MPI_Ireduce(";
    outstr += reduceSmt.sendbuf + ", ";
    outstr += reduceSmt.recvbuf + ",";
    outstr += reduceSmt.count + ", ";
    outstr += reduceSmt.datatype + ", ";
    outstr += reduceSmt.op + ", ";
    outstr += reduceSmt.root + ", ";
    outstr += reduceSmt.comm + ", ";
    outstr += "&" + requestName + ");";

    return outstr;
}

export function containsVariables(
    line: string,
    variableNames: Array<string>
): boolean {
    //line = line.replace(/\s/g, "");
    line = line.trim();
    let statments = line.split(
        / |,|\.|\(|\)|\{|\}|;|:|=|<|>|\/|\+|\-|\*|&|\[|\]/
    );
    let found = false;
    for (let i = 0; i < statments.length; i++) {
        variableNames.forEach((element) => {
            if (statments[i] === element) {
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
    let openDomain = ["{", "}"];
    let closeDomain = ["}", "{"];
    for (let round = 0; round <= 1; round++) {
        let subdomaincnt = 0;
        let currentPos = pos;
        while (true) {
            let line = removeComments(
                activeEditor.document.lineAt(currentPos).text
            ).line;
            let found = false;
            for (let i = 0; i < line.length; i++) {
                let c = line.charAt(i);
                if (c === openDomain[round]) {
                    subdomaincnt++;
                }
                if (c === closeDomain[round]) {
                    if (subdomaincnt === 0) {
                        domain[round] = new Position(currentPos.line, i);
                        found = true;
                        break;
                    } else {
                        subdomaincnt--;
                    }
                }
            }
            if (found) {
                break;
            }
            currentPos = currentPos.translate(offset[round]);
        }
    }

    let range = new Range(domain[1], domain[0]);

    return range;
}

export function extractParams(
    codestr: string,
    pos: number,
    splitChar: string = ","
): string[] {
    let beginParams = -1;
    let endParams = -1;
    let currentPos = pos;
    let subdomaincnt = 0;
    let mode = 0;
    while (true) {
        let char = codestr.charAt(currentPos);
        switch (mode) {
            case 0:
                // Find first open parenthesis
                if (char === "(") {
                    beginParams = currentPos;
                    mode = 1;
                }
                break;
            case 1:
                if (char === ")") {
                    endParams = currentPos;
                    mode = 3;
                }
                if (char === "(") {
                    subdomaincnt = 1;
                    mode = 2;
                }
                break;
            case 2:
                if (char === ")") {
                    subdomaincnt -= 1;
                    if (subdomaincnt === 0) {
                        mode = 1;
                    }
                }
                if (char === "(") {
                    subdomaincnt += 1;
                }
                break;
            default:
                mode = 0;
                break;
        }
        if (mode === 3) {
            break;
        }
        currentPos += 1;
        if (currentPos >= codestr.length) {
            break;
        }
    }

    if (beginParams === -1 || endParams === -1 || beginParams >= endParams) {
        return [];
    }
    let paramstr = codestr.slice(beginParams + 1, endParams);
    let params = paramstr.split(splitChar);

    for (let i = 0; i < params.length; i += 1) {
        params[i] = params[i].trim();
    }
    return params;
}

async function functionConflictDialog(
    name: string,
    location: Position
): Promise<boolean> {
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
        return false;
    }
    activeEditor.selection = new Selection(
        location,
        new Position(location.line, location.character + name.length)
    );
    activeEditor.revealRange(
        new Range(
            location,
            new Position(location.line, location.character + name.length)
        ),
        TextEditorRevealType.InCenter
    );
    let result = await confirmationDialog(
        "Does function '" +
            name +
            "' have a datarace with the buffer variable?" +
            "\nThis is normaly the case, if the buffer for the send/recv statment is defined globaly, and is accessed by the function."
    );

    return result;
}

export async function extendOverlapWindow(
    pos: Position,
    variableNames: Array<string>
): Promise<{ pos: Position; conflict: boolean }> {
    let activeEditor = window.activeTextEditor;

    if (activeEditor === undefined) {
        return { pos: pos, conflict: false };
    }
    let functionConfig =
        workspace.getConfiguration("mpiconv").get<string>("FunctionDataRace") ||
        "ask";

    let currentPos = pos; // pos?
    let subdomainCnt = 0;
    let validPos = currentPos;
    let foundConflict = false;
    let isInComment = false;
    while (currentPos.line < activeEditor.document.lineCount) {
        let line = activeEditor.document.lineAt(currentPos);
        if (line.isEmptyOrWhitespace) {
            currentPos = currentPos.translate(1);
            continue;
        }

        let commentReturn = removeComments(line.text, isInComment);
        isInComment = commentReturn.isInComment;
        let lineTxt = commentReturn.line;
        if (subdomainCnt === 0) {
            validPos = new Position(
                currentPos.line,
                line.firstNonWhitespaceCharacterIndex
            );
        }
        subdomainCnt += subDomainChangeInLine(lineTxt);
        if (subdomainCnt < 0) {
            break;
        }

        if (containsVariables(lineTxt, variableNames)) {
            foundConflict = true;
            break;
        }

        // check for functionCalls
        let functions = containsFunctionCalls(lineTxt);
        let conflict = false;
        if (functionConfig !== "never") {
            for (let i = 0; i < functions.length; i++) {
                let location = new Position(
                    currentPos.line,
                    functions[i].location
                );
                if (knownFunctions.includes(functions[i].name.trim())) {
                    continue;
                }
                if (knownConflictFunctions.includes(functions[i].name.trim())) {
                    conflict = true;
                    break;
                }
                switch (functionConfig) {
                    case "ask":
                        if (
                            await functionConflictDialog(
                                functions[i].name,
                                location
                            )
                        ) {
                            conflict = true;
                            break;
                        }
                        break;
                    case "always":
                        conflict = true;
                        break;
                }
            }
        }
        if (conflict) {
            foundConflict = true;
            break;
        }
        currentPos = currentPos.translate(1);
    }

    // find validPos
    // TODO: is in comment but reversed
    isInComment = false;
    while (validPos.line > pos.line) {
        let newPos = validPos.translate(-1);
        let line = activeEditor.document.lineAt(newPos);
        if (line.isEmptyOrWhitespace) {
            validPos = newPos;
            continue;
        }
        let lineTxt = removeComments(line.text).line;
        let lastChar = lineTxt.trim().charAt(lineTxt.trim().length - 1);
        if (lastChar === ";" || lastChar === "}") {
            validPos = new Position(
                validPos.line,
                activeEditor.document.lineAt(
                    validPos
                ).firstNonWhitespaceCharacterIndex
            );
            break;
        }
        validPos = newPos;
    }
    return { pos: validPos, conflict: foundConflict };
}

interface functionConflict {
    name: string;
    location: number;
}

export function containsFunctionCalls(line: string): functionConflict[] {
    let functions: functionConflict[] = [];
    let currentPos = 0;
    while (currentPos < line.length) {
        let pos = line.indexOf("(", currentPos);
        if (pos === -1) {
            break;
        }
        let toPar = line.substring(currentPos, pos).trimEnd();
        if (toPar.charAt(toPar.length - 1).match(/\w/) !== null) {
            let loc = pos;
            let behind_WS = false;
            while (loc > 0) {
                if (line.charAt(loc - 1).match(/\w/) === null) {
                    if (behind_WS) {
                        break;
                    }
                } else {
                    behind_WS = true;
                }
                loc -= 1;
            }
            let funcname = line.substring(loc, pos);
            functions.push({ name: funcname, location: loc });
        }
        currentPos = pos + 1;
    }
    return functions;
}

export function subDomainChangeInLine(line: string): number {
    let dif = 0;
    let id = 0;
    while (id !== -1) {
        id = line.indexOf("{", id);
        if (id !== -1) {
            dif += 1;
            id += 1;
        }
    }
    id = 0;
    while (id !== -1) {
        id = line.indexOf("}", id);
        if (id !== -1) {
            dif -= 1;
            id += 1;
        }
    }
    return dif;
}

export function removeComments(
    line: string,
    isInComment?: boolean
): { line: string; isInComment: boolean } {
    enum States {
        noComment,
        oneSlash,
        doubleSlash,
        slashStar,
    }

    if (isInComment === undefined) {
        isInComment = false;
    }

    let newLine = "";
    let state = isInComment ? States.slashStar : States.noComment;
    for (let i = 0; i < line.length; i += 1) {
        let char = line[i];
        switch (state) {
            case States.noComment:
                if (char === "/") {
                    state = States.oneSlash;
                } else {
                    newLine += char;
                }
                break;
            case States.oneSlash:
                if (char === "/") {
                    newLine += "  ";
                    state = States.doubleSlash;
                } else if (char === "*") {
                    newLine += "  ";
                    state = States.slashStar;
                } else {
                    newLine += "/" + char;
                    state = States.noComment;
                }
                break;
            case States.doubleSlash:
                if (char === "\n") {
                    state = States.noComment;
                    newLine += char;
                } else {
                    newLine += " ";
                }
                break;
            case States.slashStar:
                if (char === "/" && line[i - 1] === "*") {
                    newLine += " ";
                    state = States.noComment;
                } else {
                    newLine += " ";
                }
                break;
        }
    }
    return { line: newLine, isInComment: state === States.slashStar };
}

export function removeChars(str: string, chars: string[]) {
    let out = "";
    for (let i = 0; i < str.length; i += 1) {
        let char = str[i];
        if (!chars.includes(char)) {
            out += char;
        }
    }
    return out;
}

export function findStringInDocument(
    editor: TextEditor,
    searchString: string
): Position[] {
    let posArr: Position[] = [];
    let currentline = 0;
    let isInComment = false;
    while (currentline < editor.document.lineCount) {
        let line = editor.document.lineAt(new Position(currentline, 1));
        if (line.isEmptyOrWhitespace) {
            currentline += 1;
            continue;
        }
        let commentReturn = removeComments(line.text, isInComment);
        let lineTxt = commentReturn.line;
        isInComment = commentReturn.isInComment;
        let index = lineTxt.indexOf(searchString);
        if (index === -1) {
            currentline += 1;
            continue;
        }
        let position = new Position(currentline, index);
        posArr.push(position);
        currentline += 1;
    }

    return posArr;
}

export function runFormatter() {
    let run_formatter = workspace
        .getConfiguration("mpiconv")
        .get<boolean>("runFormatter");
    if (run_formatter === undefined) {
        run_formatter === true;
    }
    if (run_formatter) {
        commands.executeCommand("editor.action.formatDocument");
    }
}

export function getStatementString(statement: StatementType): string {
    switch (statement) {
        case StatementType.MPI_Send:
            return "MPI_Send";
        case StatementType.MPI_Recv:
            return "MPI_Recv";
        case StatementType.MPI_Reduce:
            return "MPI_Reduce";
        default:
            return "";
    }
}

export function getFullRangeOfFunction(
    editor: TextEditor,
    pos: Position
): Range {
    let startPos = editor.document.offsetAt(pos);
    let codeStr = removeComments(editor.document.getText()).line;
    let endPos = codeStr.indexOf(")", startPos);
    if (endPos === -1) {
        endPos = startPos;
    }
    return new Range(pos, editor.document.positionAt(endPos));
}

export function gotoStatement(editor: TextEditor, pos: Position): void {
    editor.revealRange(
        new Range(pos, new Position(pos.line, pos.character + 1)),
        TextEditorRevealType.InCenter
    );
}
