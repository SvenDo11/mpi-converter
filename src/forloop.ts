import { ViewColumn, Position, Range, window } from "vscode";
import { confirmationDialog } from "./dialogs";
import { containsVariables, findDomain, removeComments } from "./util";

const separators = [";", "}"];

export async function checkForLoop(pos: Position) {
    let activeEditor = window.activeTextEditor;
    if (activeEditor === undefined) {
        return false;
    }
    let domain = findDomain(pos) || new Range(pos, pos.translate(1));

    let currentPos = domain.start;
    let isForLoop = false;
    let isInComment = false;
    // Itterate over previous lines to find statement bevor current domain
    while (currentPos.line >= 0) {
        let line = activeEditor.document.lineAt(currentPos);
        if (line.isEmptyOrWhitespace) {
            currentPos = currentPos.translate(-1);
            continue;
        }
        let commentReturn = removeComments(line.text, isInComment);
        let lineTxt = commentReturn.line;
        isInComment = commentReturn.isInComment;
        if (containsVariables(lineTxt, ["for"])) {
            isForLoop = true;
            break;
        }
        if (lineTxt.includes(";") || lineTxt.includes("}")) {
            isForLoop = false;
            break;
        }
        currentPos = currentPos.translate(-1);
    }

    if (isForLoop) {
        if (
            await confirmationDialog(
                "Is this mpi statement in a for loop, that can be unrolled?" +
                    "\nThis is usually the case, if the loop is used to combine multiple independent send/recv statments. If the send/recv statments are dependent on the statements of the previous iteration, the loop can not be unrolled."
            )
        ) {
            let line = removeComments(
                activeEditor.document.lineAt(currentPos).text
            ).line;
            let index = line.indexOf("for");
            if (index === -1) {
                index ==
                    activeEditor.document.lineAt(currentPos)
                        .firstNonWhitespaceCharacterIndex;
            }
            return new Position(currentPos.line, index);
        }
    }
    return false;
}
