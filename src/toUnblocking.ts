import { getVSCodeDownloadUrl } from "@vscode/test-electron/out/util";
import {
    window,
    Position,
    Range,
    Selection,
    TextEditorRevealType,
    TextEditor,
    commands,
    workspace,
    Color,
    ThemeColor,
} from "vscode";

import { confirmationDialog, inputDialog } from "./dialogs";
import {
    MPI_SendType,
    MPI_RecvType,
    StatementType,
    MPI_ReduceType,
} from "./statementsTypes";
import {
    sendToIsend,
    recvToIrecv,
    containsVariables,
    findDomain,
    extendOverlapWindow,
    extractParams,
    removeComments,
    removeChars,
    runFormatter,
    getStatementString,
    getFullRangeOfFunction,
    reduceToIreduce,
} from "./util";
import { checkForLoop } from "./forloop";
import { stat } from "fs";

const defaultConflicts = ["return", "MPI_Finalize"];

abstract class BlockingToUnblocking<MPI_Type> {
    activeEditor: TextEditor | undefined = undefined;
    codestr: string = "";
    isLoop: boolean = false;
    loopPos?: Position;

    blockingInst: MPI_Type | undefined;
    loopStr: string = "";
    loopCntStr = "N";
    loopIterator: string = "";

    indentation = "";

    status = "status";
    request = "request";

    constructor(public pos: Position, public canBeLoop: Boolean = true) {}

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

        let isForLoop = this.canBeLoop ? await checkForLoop(editorPos) : false;
        this.isLoop = isForLoop instanceof Position;

        let foundWaitPos = editorPos;
        let foundWait = false;

        if (this.isLoop) {
            this.loopPos = isForLoop as Position;
            // Check if a conflict is allready found in the loop:
            let conflict = await extendOverlapWindow(
                this.getEndOfStatmentPos(editorPos).translate(1),
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
                this.loopStr = removeComments(
                    this.activeEditor.document.lineAt(isForLoop as Position)
                        .text
                ).line;
                this.loopIterator = await this.getLoopIterator();
                this.loopCntStr = await this.getLoopIterationCount();
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
                editBuilder.insert(waitPos, suffixStr + "\n" + indentation);
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
                cntPreview = containsVariables(comp[0], [this.loopIterator])
                    ? comp[1]
                    : comp[0];
            }
        }
        let cntString = await inputDialog(
            "Enter number of loop iterations:",
            cntPreview.trim(),
            "You can enter a specific number, a variable name or a c++ expression to determine the loop iterations. Most of the time the correct statement is written in the termination condition of the for loop parameters."
        );
        if (cntString === undefined || cntString === "") {
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
            iteratorpreview.trim(),
            "You need to provide a iterator for the request and status variables of the MPI unblocking operation. In most cases this is the for loop iterator."
        );
        if (iteratorString === undefined || iteratorString === "") {
            window.showErrorMessage(
                "Without a valid loop iterator, the loop cannot correctly execute the MPI statements. Please edit the iterator manualy!"
            );
            iteratorString = "/* MISSING ITERATOR */";
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
            removeComments(this.codestr).line,
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
            "status",
            "Make sure to use a unique variable name in the current domain. (Or just 'MPI_STATUS_IGNORE')"
        );
        if (this.status === undefined || this.status.trim() === "") {
            this.status === "/* ENTER STATUS VARIABLE */";
        }
        this.request = await inputDialog(
            "What should the request variable be named?:",
            "request",
            "Make sure to use a unique variable name in the current domain."
        );
        if (this.request === undefined || this.request.trim() === "") {
            this.request === "/* ENTER REQUEST VARIABLE */";
        }

        let statusStr = "MPI_Status " + this.status + ";";
        let requestStr = "MPI_Request " + this.request + ";";
        if (this.isLoop) {
            statusStr =
                "MPI_Status  " + this.status + "[" + this.loopCntStr + "];";
            requestStr =
                "MPI_Request " + this.request + "[" + this.loopCntStr + "];";
        }
        let returnStr =
            this.status === "MPI_STATUS_IGNORE"
                ? requestStr
                : statusStr + "\n" + requestStr;
        return returnStr;
    }

    getSuffixStr(): string {
        let status = this.status;
        if (status !== "MPI_STATUS_IGNORE") {
            status = "&" + status;
        }
        let waitStr = "MPI_Wait(&" + this.request + ", " + status + ");";
        if (this.isLoop) {
            if (status !== "MPI_STATUS_IGNORE") {
                status = "MPI_STATUSES_IGNORE";
            }
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
            throw new Error("Blocking instruction not set!");
        }
        let buf = this.blockingInst.buf;
        let statments = buf.split(/ |,|\(|\)|\{|\}|;|=|\/|\+|\-|\*|\[|\]|\&/);
        if (statments.length > 1) {
            let guessedbuffer = "";
            let foundStatements = 0;
            for (let i = 0; i < statments.length; i += 1) {
                if (statments[i] !== "") {
                    if (guessedbuffer === "") {
                        guessedbuffer = statments[i];
                    }
                    foundStatements += 1;
                }
            }
            if (foundStatements !== 1) {
                buf = await inputDialog(
                    "What is the buffer for the MPI message?",
                    guessedbuffer,
                    "You need to provide the name of the buffer variable of the MPI message. This is the array you specify in the first parameter."
                );
                while (buf === undefined || buf.trim() === "") {
                    buf = await inputDialog(
                        "What is the buffer for the MPI message? (This can not be left blank)",
                        guessedbuffer,
                        "You need to provide the name of the buffer variable of the MPI message. This is the array you specify in the first parameter."
                    );
                }
            } else {
                buf = guessedbuffer;
            }
        }
        this.conflictVariableStr = [buf];
        return [buf].concat(defaultConflicts);
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
            removeComments(this.codestr).line,
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
            "request",
            "Make sure to use a unique variable name in the current Domain."
        );
        if (this.request.trim() === "" || this.request === undefined) {
            this.request = "/* instert request variable */";
        }
        let requestStr = "MPI_Request " + this.request + ";";
        let statusParam = this.blockingInst?.status || "Error";

        this.status = removeChars(statusParam, ["&", "*"]);

        if (this.isLoop) {
            requestStr =
                "MPI_Request " + this.request + "[" + this.loopCntStr + "];";

            if (this.status !== "MPI_STATUS_IGNORE") {
                this.useOldStatus = await confirmationDialog(
                    "Use old status variable: '" +
                        this.status +
                        "'?" +
                        "\nThe status variable needs to be an array. If you use the old status variable, it will be converted into an array. This can result in errors, if you used the status variable multiple times."
                );
                if (!this.useOldStatus) {
                    this.status = await inputDialog(
                        "What should the new status variable be named?:",
                        "statusArr",
                        "Choose a new variable name, that is unique in the current Domain."
                    );
                    if (
                        this.status.trim() === "" ||
                        this.status === undefined
                    ) {
                        this.status = "/* instert status variable*/";
                    }
                    requestStr =
                        "MPI_Status " +
                        this.status +
                        "[" +
                        this.loopCntStr +
                        "];\n" +
                        requestStr;
                }
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
            let status =
                this.status === "MPI_STATUS_IGNORE"
                    ? "MPI_STATUSES_IGNORE"
                    : this.status;
            waitStr =
                "MPI_Waitall(" +
                this.loopCntStr +
                ", " +
                this.request +
                ", " +
                status +
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
        let buf;
        if (this.conflictVariableStr === undefined) {
            if (this.blockingInst === undefined) {
                throw new Error("Blocking instruciton not set!");
            }
            buf = this.blockingInst.buf;
            let statments = buf.split(
                / |,|\(|\)|\{|\}|;|=|\/|\+|\-|\*|\[|\]|&/
            );
            if (statments.length > 1) {
                let guessedbuffer = "";
                let foundStatements = 0;
                for (let i = 0; i < statments.length; i += 1) {
                    if (statments[i] !== "") {
                        if (guessedbuffer === "") {
                            guessedbuffer = statments[i];
                        }
                        foundStatements += 1;
                    }
                }
                if (foundStatements !== 1) {
                    buf = await inputDialog(
                        "What is the buffer for the MPI message?",
                        guessedbuffer,
                        "You need to provide the name of the buffer variable of the MPI message. This is the array you specify in the first parameter."
                    );
                    while (buf === undefined || buf.trim() === "") {
                        buf = await inputDialog(
                            "What is the buffer for the MPI message? (This can not be left blank)",
                            guessedbuffer,
                            "You need to provide the name of the buffer variable of the MPI message. This is the array you specify in the first parameter."
                        );
                    }
                } else {
                    buf = guessedbuffer;
                }
            }
        } else {
            buf = this.conflictVariableStr[0];
        }
        if (this.status === "MPI_STATUS_IGNORE") {
            this.conflictVariableStr = [buf];
        } else {
            this.conflictVariableStr = [buf, this.status];
        }
        return this.conflictVariableStr.concat(defaultConflicts);
    }

    async afterReplace(): Promise<void> {
        if (
            this.activeEditor === undefined ||
            !this.isLoop ||
            !this.useOldStatus
        ) {
            return;
        }

        let lineTxt = "";
        let currentline = this.pos;
        let isInComment = false;
        while (currentline.line < this.activeEditor.document.lineCount) {
            let commentReturn = removeComments(
                this.activeEditor.document.lineAt(currentline).text,
                isInComment
            );
            lineTxt = commentReturn.line;
            isInComment = commentReturn.isInComment;

            let index = lineTxt.indexOf("MPI_Irecv");
            if (index !== -1) {
                break;
            }
            currentline = currentline.translate(1);
        }

        while (currentline.line >= 0) {
            let commentReturn = removeComments(
                this.activeEditor.document.lineAt(currentline).text
            );
            lineTxt = commentReturn.line;

            let index = lineTxt.indexOf(this.status.trim());
            if (index !== -1) {
                let firstStatement = lineTxt.trim().split(" ")[0];
                if (firstStatement.trim().substring(0, 10) === "MPI_Status") {
                    break;
                }
            }
            currentline = currentline.translate(-1);
        }

        if (currentline.line > (this.loopPos?.line || this.pos.line)) {
            // TODO: Fix this
        } else {
            let index = lineTxt.indexOf(this.status.trim());
            await this.activeEditor.edit((editBuilder) => {
                editBuilder.insert(
                    new Position(currentline.line, index + this.status.length),
                    "[" + this.loopCntStr + "]"
                );
            });
        }
    }
}

class ReduceConverter extends BlockingToUnblocking<MPI_ReduceType> {
    conflictVariableStr: string[] | undefined = undefined;

    constructor(reducePos: Position) {
        super(reducePos, false);
    }

    getInstruction(): MPI_ReduceType {
        if (this.activeEditor === undefined) {
            throw new Error("activeEditor was not set.");
        }
        let params = extractParams(
            removeComments(this.codestr).line,
            this.activeEditor.document.offsetAt(this.pos)
        );

        if (params.length !== 7) {
            throw new Error(
                "Did not get the appropriate amount of parameters from function. Expected 7 but got " +
                    params.length +
                    "!"
            );
        }
        let sendSmt: MPI_ReduceType = {
            sendbuf: params[0],
            recvbuf: params[1],
            count: params[2],
            datatype: params[3],
            op: params[4],
            root: params[5],
            comm: params[6],
        };
        return sendSmt;
    }

    async getPrefixStr(): Promise<string> {
        this.status = await inputDialog(
            "What should the status variable be named?:",
            "status",
            "Make sure to use a unique variable name in the current domain. (Or just 'MPI_STATUS_IGNORE')"
        );
        if (this.status === undefined || this.status.trim() === "") {
            this.status === "/* ENTER STATUS VARIABLE */";
        }
        this.request = await inputDialog(
            "What should the request variable be named?:",
            "request",
            "Make sure to use a unique variable name in the current domain."
        );
        if (this.request === undefined || this.request.trim() === "") {
            this.request === "/* ENTER REQUEST VARIABLE */";
        }

        let statusStr = "MPI_Status " + this.status + ";";
        let requestStr = "MPI_Request " + this.request + ";";
        if (this.isLoop) {
            statusStr =
                "MPI_Status  " + this.status + "[" + this.loopCntStr + "];";
            requestStr =
                "MPI_Request " + this.request + "[" + this.loopCntStr + "];";
        }
        let returnStr =
            this.status === "MPI_STATUS_IGNORE"
                ? requestStr
                : statusStr + "\n" + requestStr;
        return returnStr;
    }

    getSuffixStr(): string {
        let status = this.status;
        if (status !== "MPI_STATUS_IGNORE") {
            status = "&" + status;
        }
        let waitStr = "MPI_Wait(&" + this.request + ", " + status + ");";
        if (this.isLoop) {
            if (status !== "MPI_STATUS_IGNORE") {
                status = "MPI_STATUSES_IGNORE";
            }
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
        return reduceToIreduce(
            this.blockingInst,
            this.isLoop
                ? this.request + "[" + this.loopIterator + "]"
                : this.request
        );
    }

    async getSingleBuffer(buffer: string, buffername: string = "buffer") {
        let buf = buffer;
        let statments = buf.split(/ |,|\(|\)|\{|\}|;|=|\/|\+|\-|\*|\[|\]|\&/);
        if (statments.length > 1) {
            let guessedbuffer = "";
            let foundStatements = 0;
            for (let i = 0; i < statments.length; i += 1) {
                if (statments[i] !== "") {
                    if (guessedbuffer === "") {
                        guessedbuffer = statments[i];
                    }
                    foundStatements += 1;
                }
            }
            if (foundStatements !== 1) {
                buf = await inputDialog(
                    "What is the " + buffername + " for the MPI message?",
                    guessedbuffer,
                    "You need to provide the name of the buffer variable of the MPI message. This is the array you specify in the first parameter."
                );
                while (buf === undefined || buf.trim() === "") {
                    buf = await inputDialog(
                        "What is the " +
                            buffername +
                            " for the MPI message? (This can not be left blank)",
                        guessedbuffer,
                        "You need to provide the name of the buffer variable of the MPI message. This is the array you specify in the first parameter."
                    );
                }
            } else {
                buf = guessedbuffer;
            }
        }
        return buf;
    }

    async getConflictVariableStr(): Promise<string[]> {
        if (this.conflictVariableStr !== undefined) {
            return this.conflictVariableStr;
        }
        if (this.blockingInst === undefined) {
            throw new Error("Blocking instruction not set!");
        }

        this.conflictVariableStr = [
            await this.getSingleBuffer(
                this.blockingInst.sendbuf,
                "send buffer"
            ),
            await this.getSingleBuffer(
                this.blockingInst.recvbuf,
                "recieve buffer"
            ),
        ];
        return this.conflictVariableStr.concat(defaultConflicts);
    }

    async afterReplace(): Promise<void> {
        // Empty on purpose;
    }
}

export async function blockingToUnblockingMain() {
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
        return;
    }

    let found_something = false;
    let searchStrings = ["MPI_Send", "MPI_Recv", "MPI_Reduce"];
    let currentline = 0;
    let isInComment = false;
    while (currentline < activeEditor.document.lineCount) {
        let line = activeEditor.document.lineAt(new Position(currentline, 1));
        if (line.isEmptyOrWhitespace) {
            currentline += 1;
            continue;
        }
        let commentReturn = removeComments(line.text, isInComment);
        let lineTxt = commentReturn.line;
        isInComment = commentReturn.isInComment;
        if (!containsVariables(lineTxt, searchStrings)) {
            currentline += 1;
            continue;
        }
        let indexes = searchStrings.map((searchString) => {
            return lineTxt.indexOf(searchString);
        });
        found_something = true;
        for (let i = 0; i < indexes.length; i += 1) {
            if (indexes[i] === -1) {
                continue;
            }
            let position = new Position(currentline, indexes[i]);
            await convertStatement(
                activeEditor,
                position,
                i === 0 ? StatementType.MPI_Send : StatementType.MPI_Recv
            );
        }

        currentline += 1;
    }

    if (found_something) {
        window.showInformationMessage("MPI Converter done!");
    } else {
        window.showInformationMessage("No relevant MPI statements found!");
    }
}

export async function convertStatement(
    editor: TextEditor,
    position: Position,
    statement: StatementType
) {
    let searchString = getStatementString(statement);
    let rep = new Range(
        position,
        new Position(position.line, position.character + searchString.length)
    );

    // Highlighting and revealing
    editor.selection = new Selection(rep.start, rep.end);
    editor.revealRange(rep, TextEditorRevealType.InCenter);
    let fullRange = getFullRangeOfFunction(editor, position);
    let decoration = window.createTextEditorDecorationType({
        borderColor: "red",
        borderStyle: "solid",
        borderSpacing: "10",
    });
    editor.setDecorations(decoration, [fullRange]);
    let result = await confirmationDialog(
        "Turn this " +
            searchString +
            " in line " +
            (position.line + 1) +
            " into an non-blocking one?" +
            " Turning a blocking send or recv statement into an non-blocking one, can provide performance benefits." +
            " Run 'MPI Converter Help' for more information."
    );

    if (result) {
        if (statement === StatementType.MPI_Send) {
            let replacer = new SendConverter(position);
            await replacer.replace();
        } else if (statement === StatementType.MPI_Recv) {
            let replacer = new RecvConverter(position);
            await replacer.replace();
        } else if (statement === StatementType.MPI_Reduce) {
            let replacer = new ReduceConverter(position);
            await replacer.replace();
        } else {
            window.showErrorMessage("Invalid statement");
        }
        window.showInformationMessage(
            "Converted " +
                searchString +
                " in line " +
                (position.line + 1) +
                " successfully"
        );
    }
    decoration.dispose();
}
