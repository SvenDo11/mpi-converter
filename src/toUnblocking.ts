import { getVSCodeDownloadUrl } from "@vscode/test-electron/out/util";
import {
    window,
    Position,
    Range,
    Selection,
    TextEditorRevealType,
    TextEditor,
} from "vscode";

import { confirmationDialog, inputDialog } from "./dialogs";
import { MPI_SendType, MPI_RecvType } from "./statementsTypes";
import {
    sendToIsend,
    recvToIrecv,
    containsVariables,
    findDomain,
    extendOverlapWindow,
    extractParams,
    removeComments,
    removeChars,
} from "./util";
import { checkForLoop } from "./forloop";
import { error } from "console";
import { stat } from "fs";

abstract class BlockingToUnblocking<MPI_Type> {
    activeEditor: TextEditor | undefined = undefined;
    codestr: string = "";
    isLoop: boolean = false;
    loopPos?: Position;

    blockingInst: MPI_Type | undefined;
    loopStr: string = "";
    loopCntStr = "N";
    loopIterator: string = "";

    status = "status";
    request = "request";

    constructor(public pos: Position) {}

    abstract getInstruction(): MPI_Type;

    abstract getPrefixStr(): Promise<string>;
    abstract getSuffixStr(): string;
    abstract transformToUnblocking(): string;

    abstract getConflictVariableStr(): Promise<string[]>;

    abstract afterReplace(): Promise<void>;

    async replace() {
        this.activeEditor = window.activeTextEditor;
        if (this.activeEditor === undefined) {
            return;
        }
        this.codestr = this.activeEditor.document.getText();
        this.blockingInst = this.getInstruction();

        let editorPos = this.pos;

        let isForLoop = await checkForLoop(editorPos);
        this.isLoop = isForLoop instanceof Position;

        let foundWaitPos = editorPos;
        let foundWait = false;

        if (this.isLoop) {
            this.loopPos = isForLoop as Position;
            // Check if a conflict is allready found in the loop:
            let conflict = await extendOverlapWindow(
                this.getEndOfStatmentPos(editorPos),
                await this.getConflictVariableStr()
            );

            if (conflict.conflict) {
                window.showErrorMessage(
                    "The blocking MPI instruction was found to be in a loop. \
                But because of a conflict, the MPI_wait call cannot be outside the for loop. \
                This severly impacts the possible performance gain from using unblocking instructions.\
                You can manually change your code, to put the conflicting statement outside the for loop and past other statements, if possible. \
                Another run of this tool may then find a better optimisation."
                );

                this.isLoop = false;
                foundWait = true;
                foundWaitPos = conflict.pos;
            } else {
                this.loopStr = removeComments(this.activeEditor.document.lineAt(
                    isForLoop as Position
                ).text).line;
                this.loopCntStr = await this.getLoopIterationCount();
                this.loopIterator = await this.getLoopIterator();
            }
        }

        // TODO: This is bad. Make it better, pls
        let endSmt = this.codestr.indexOf(
            ";",
            this.activeEditor.document.offsetAt(this.pos)
        );
        let range = new Range(
            editorPos,
            this.activeEditor.document.positionAt(endSmt + 1)
        );

        let prefixStr = await this.getPrefixStr();
        let unblockingStr = this.transformToUnblocking();
        let suffixStr = this.getSuffixStr();

        if (!this.isLoop) {
            let indentation = this.activeEditor.document
                .lineAt(editorPos)
                .text.substring(
                    0,
                    this.activeEditor.document.lineAt(editorPos)
                        .firstNonWhitespaceCharacterIndex
                );
            let newLnStr = "\n" + indentation;
            let endSmt = this.codestr.indexOf(
                ";",
                this.activeEditor.document.offsetAt(this.pos)
            );
            let range = new Range(
                editorPos,
                this.activeEditor.document.positionAt(endSmt + 1)
            );

            let endPos = range.end.translate(1);
            let waitPos = foundWait
                ? foundWaitPos
                : (
                      await extendOverlapWindow(
                          endPos,
                          await this.getConflictVariableStr()
                      )
                  ).pos;

            await this.activeEditor.edit((editBuilder) => {
                editBuilder.insert(waitPos, suffixStr + "\n" + indentation );
            });

            await this.activeEditor.edit((editBuilder) => {
                editBuilder.replace(
                    range,
                    prefixStr + newLnStr + unblockingStr
                );
            });
        } else {
            await this.activeEditor.edit((editBuilder) => {
                editBuilder.replace(range, unblockingStr);
            });

            let prefixPos =
                isForLoop instanceof Position ? isForLoop : editorPos;
            let indentation = this.activeEditor.document
                .lineAt(prefixPos)
                .text.substring(
                    0,
                    this.activeEditor.document.lineAt(prefixPos)
                        .firstNonWhitespaceCharacterIndex
                );
            let newLnStr = "\n" + indentation;

            await this.activeEditor.edit((editBuilder) => {
                editBuilder.insert(prefixPos, prefixStr + newLnStr);
            });

            let endPos = findDomain(editorPos.translate(2))?.end?.translate(1);
            let waitPos = (
                await extendOverlapWindow(
                    endPos ? endPos : editorPos,
                    await this.getConflictVariableStr()
                )
            ).pos;
            indentation = this.activeEditor.document
                .lineAt(waitPos)
                .text.substring(
                    0,
                    this.activeEditor.document.lineAt(waitPos)
                        .firstNonWhitespaceCharacterIndex
                );
            await this.activeEditor.edit((editBuilder) => {
                editBuilder.insert(waitPos, suffixStr + "\n" + indentation);
            });
        }
        await this.afterReplace();
    }

    async getLoopIterationCount(): Promise<string> {
        let loopParams = extractParams(this.loopStr, 0, ";");
        let cntPreview = "";
        if (loopParams.length === 3) {
            let comp = loopParams[1].split(/<|>|==|!=|<=|>=|<=>/);
            if (comp.length === 2) {
                let lhs = loopParams[0].split("=")[0].split(" ");
                let iterator = lhs.length == 1 ? lhs[0] : lhs[1];
                cntPreview = containsVariables(comp[0], [iterator])
                    ? comp[1]
                    : comp[0];
            }
        }
        let cntString = await inputDialog(
            "Enter number of loop iterations:",
            cntPreview,
            "You can enter a specific number, a variable name or a c++ expression to determine the loop iterations. Most of the time the correct statement is written in the for loop parameters."
        );
        if (cntString === undefined) {
            window.showErrorMessage(
                "Without a valid amount of loop iterations, the loop cannot be correctly unrolled. Please edit the array size manualy!"
            );
            cntString = "/* MISSING SIZE */";
        }
        return cntString;
    }

    async getLoopIterator(): Promise<string> {
        let loopParams = extractParams(this.loopStr, 0, ";");
        let iteratorpreview = "";
        if (loopParams.length === 3) {
            let lhs = loopParams[0].split("=")[0].split(" ");
            for (let i = lhs.length - 1; i >= 0; i -= 1) {
                if (lhs[i] !== "") {
                    iteratorpreview = lhs[i];
                    break;
                }
            }
        }

        let iteratorString = await inputDialog(
            "Enter loop iterator:",
            iteratorpreview,
            "You need to provide a iterator for the request and status variables of the MPI unblocking operation. In most cases this is the for loop iterator."
        );
        if (iteratorString === undefined) {
            window.showErrorMessage(
                "Without a valid loop iterator, the loop cannot correctly execute the MPI statements. Please edit the iterator manualy!"
            );
            iteratorString = "/* MISSING SIZE */";
        }
        return iteratorString;
    }

    getEndOfStatmentPos(pos: Position): Position {
        if (this.activeEditor === undefined) {
            return pos;
        }
        let currentPos = pos;
        while (currentPos.line < this.activeEditor.document.lineCount) {
            let line = this.activeEditor.document.lineAt(currentPos);
            if (line.text.indexOf(";") !== -1) {
                return new Position(currentPos.line, line.text.indexOf(";"));
            }
            currentPos = currentPos.translate(1);
        }
        return currentPos;
    }
}

class SendConverter extends BlockingToUnblocking<MPI_SendType> {
    conflictVariableStr: string[] | undefined = undefined;

    getInstruction(): MPI_SendType {
        if (this.activeEditor === undefined) {
            throw new Error("activeEditor was not set.");
        }
        let params = extractParams(
            this.codestr,
            this.activeEditor.document.offsetAt(this.pos)
        );

        if (params.length !== 6) {
            throw new Error(
                "Did not get the appropriate amount of parameters from function. Expected 6 but got " +
                    params.length +
                    "!"
            );
        }
        let sendSmt: MPI_SendType = {
            buf: params[0],
            count: params[1],
            datatype: params[2],
            dest: params[3],
            tag: params[4],
            comm: params[5],
        };
        return sendSmt;
    }

    async getPrefixStr(): Promise<string> {
        this.status = await inputDialog(
            "What should the status variable be named?:",
            "status"
        );
        this.request = await inputDialog(
            "What should the request variable be named?:",
            "request"
        );

        let statusStr = "MPI_Status " + this.status + ";";
        let requestStr = "MPI_Request " + this.request + ";";
        if (this.isLoop) {
            statusStr =
                "MPI_Status  " + this.status + "[" + this.loopCntStr + "];";
            requestStr =
                "MPI_Request " + this.request + "[" + this.loopCntStr + "];";
        }
        return statusStr + "\n" + requestStr;
    }

    getSuffixStr(): string {
        let waitStr = "MPI_Wait(&" + this.request + ", &" + this.status + ");";
        if (this.isLoop) {
            waitStr =
                "MPI_Waitall(" +
                this.loopCntStr +
                ", " +
                this.request +
                ", " +
                this.status +
                ");";
        }
        return waitStr;
    }

    transformToUnblocking(): string {
        if (this.blockingInst === undefined) {
            throw new Error("Blocking instruciton not set!");
        }
        return sendToIsend(
            this.blockingInst,
            this.isLoop
                ? this.request + "[" + this.loopIterator + "]"
                : this.request
        );
    }

    async getConflictVariableStr(): Promise<string[]> {
        if (this.conflictVariableStr !== undefined) {
            return this.conflictVariableStr;
        }
        if (this.blockingInst === undefined) {
            throw new Error("Blocking instruciton not set!");
        }
        let buf = this.blockingInst.buf;
        let statments = buf.split(/ |,|\(|\)|\{|\}|;|=|\/|\+|\-|\*|\[|\]|&/);
        if (statments.length > 1) {
            let guessedbuffer = "";
            for (let i = 0; i < statments.length; i += 1) {
                guessedbuffer = statments[i];
                if (guessedbuffer !== "") {
                    break;
                }
            }
            buf = await inputDialog(
                "What is the buffer for the MPI message?",
                guessedbuffer,
                "You need to provide the name of the buffer variable of the MPI message. This is the array you specify in the first parameter."
            );
        }
        this.conflictVariableStr = [buf];
        return [buf];
    }

    async afterReplace(): Promise<void> {
        // Empty on purpose;
    }
}

class RecvConverter extends BlockingToUnblocking<MPI_RecvType> {
    conflictVariableStr: string[] | undefined = undefined;
    useOldStatus = false;

    getInstruction(): MPI_RecvType {
        if (this.activeEditor === undefined) {
            throw new Error("Active editor not set.");
        }
        let params = extractParams(
            this.codestr,
            this.activeEditor.document.offsetAt(this.pos)
        );

        if (params.length !== 7) {
            throw new Error(
                "Did not get the appropriate amount of parameters from function. Expected 7 but got " +
                    params.length +
                    "!"
            );
        }
        let recvSmt: MPI_RecvType = {
            buf: params[0],
            count: params[1],
            datatype: params[2],
            source: params[3],
            tag: params[4],
            comm: params[5],
            status: params[6].trim(),
        };
        return recvSmt;
    }

    async getPrefixStr(): Promise<string> {
        this.request = await inputDialog(
            "What should the request variable be named?:",
            "request"
        );
        let requestStr = "MPI_Request " + this.request + ";";

        if (this.isLoop) {
            requestStr =
                "MPI_Request " + this.request + "[" + this.loopCntStr + "];";
            
            let statusParam = this.blockingInst?.status || "Error";
            
            this.status = removeChars(statusParam, ['&', '*']);
            this.useOldStatus = await confirmationDialog("Use old status variable: '" + this.status + "'?", "The status variable needs to be an array, if you use the status variable multiple times, this can result in errors.")
            if(!this.useOldStatus) {
                this.status = await inputDialog("What should the new status variable be named?:", "statusArr", "Choose a new variable name, that is unique in the current Domain.");
                requestStr = "MPI_Status " + this.status + "[" + this.loopCntStr + "];\n" + requestStr;
            }
        }
        return requestStr;
    }
    getSuffixStr(): string {
        let waitStr =
            "MPI_Wait(&" +
            this.request +
            ", " +
            this.blockingInst?.status +
            ");";
        if (this.isLoop) {
            waitStr =
                "MPI_Waitall(" +
                this.loopCntStr +
                ", " +
                this.request +
                ", " +
                this.status +
                ");";
        }
        return waitStr;
    }
    transformToUnblocking(): string {
        if (this.blockingInst === undefined) {
            throw new Error("Blocking instruction not set!");
        }
        return recvToIrecv(
            this.blockingInst,
            this.isLoop
                ? this.request + "[" + this.loopIterator + "]"
                : this.request
        );
    }

    async getConflictVariableStr(): Promise<string[]> {
        if (this.conflictVariableStr !== undefined) {
            return this.conflictVariableStr;
        }
        if (this.blockingInst === undefined) {
            throw new Error("Blocking instruciton not set!");
        }
        let buf = this.blockingInst.buf;
        let statments = buf.split(/ |,|\(|\)|\{|\}|;|=|\/|\+|\-|\*|\[|\]|&/);
        if (statments.length > 1) {
            let guessedbuffer = "";
            for (let i = 0; i < statments.length; i += 1) {
                guessedbuffer = statments[i];
                if (guessedbuffer !== "") {
                    break;
                }
            }
            buf = await inputDialog(
                "What is the buffer for the MPI message?",
                guessedbuffer,
                "You need to provide the name of the buffer variable of the MPI message. This is the array you specify in the first parameter."
            );
        }
        this.conflictVariableStr = [buf, this.blockingInst.status];
        return [buf, this.blockingInst.status];
    }

    async afterReplace(): Promise<void> {
        if(this.activeEditor === undefined || !this.isLoop || !this.useOldStatus) {
            return;
        }

        let lineTxt = "";
        let currentline = this.pos;
        let isInComment = false;
        while(currentline.line < this.activeEditor.document.lineCount) {
            let commentReturn = removeComments(this.activeEditor.document.lineAt(currentline).text, isInComment);
            lineTxt = commentReturn.line;
            isInComment = commentReturn.isInComment;

            let index = lineTxt.indexOf("MPI_Irecv");
            if(index !== -1) {
                break;
            }
            currentline = currentline.translate(1);
        }
        
        while(currentline.line >= 0) {
            let commentReturn = removeComments(this.activeEditor.document.lineAt(currentline).text);
            lineTxt = commentReturn.line;

            let index = lineTxt.indexOf(this.status.trim());
            if(index !== -1) {
                let firstStatement = lineTxt.trim().split(" ")[0];
                if(firstStatement.trim().substring(0, 10) === "MPI_Status") {
                    break;
                }
            }
            currentline = currentline.translate(-1);
        }

        if(currentline.line > (this.loopPos?.line || this.pos.line)) {
            // TODO: Fix this
        }
        else {
            let index = lineTxt.indexOf(this.status.trim());
            await this.activeEditor.edit( (editBuilder) => {
                editBuilder.insert(new Position(currentline.line, index + this.status.length),"["+this.loopCntStr+"]");
            });
        }
    }
}

export async function blockingToUnblockingMain() {
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
        return;
    }
    let searchStrings = ["MPI_Send", "MPI_Recv"];
    for (let i = 0; i < 2; i += 1) {
        let searchString = searchStrings[i];
        let currentline = 0;
        let isInComment = false;
        while (currentline < activeEditor.document.lineCount) {
            let line = activeEditor.document.lineAt(
                new Position(currentline, 1)
            );
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
            let rep = new Range(
                position,
                new Position(
                    position.line,
                    position.character + searchString.length
                )
            );
            // Highlighting and revealing
            activeEditor.selection = new Selection(rep.start, rep.end);
            activeEditor.revealRange(rep, TextEditorRevealType.InCenter);
            let result = await confirmationDialog(
                "Turn this statement into an unblocking one?"
            );

            if (result) {
                if (i === 0) {
                    let replacer = new SendConverter(position);
                    await replacer.replace();
                } else {
                    let replacer = new RecvConverter(position);
                    await replacer.replace();
                }
            }

            currentline += 1;
        }
    }
}
