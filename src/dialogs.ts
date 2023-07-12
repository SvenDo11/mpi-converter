import { window, QuickPickOptions, workspace, InputBoxOptions, QuickPickItem, QuickPickItemKind, QuickInput} from "vscode";
import { deflateSync } from "zlib";

const conv = workspace.getConfiguration("mpiconv");

export async function confirmationDialog(msg: string, value?: string) {
    let yesStrings = conv.get<string[]>("confirmationstrings") || ["yes", "y"];
    let noStrings = conv.get<string[]>("decliningstrings") || ["no", "n"];

    let result = await window.showQuickPick(["yes", "no"], <QuickPickOptions>{
        title: msg,
        placeHolder: "yes",
        prompt: value,
        ignoreFocusOut: true,
    });
    if (result !== undefined) {
        if (yesStrings.includes(result)) {
            return true;
        }
        return false;
        // TODO: handle neither yes nor no as answer
    }
    return false;
}

export async function inputDialog(
    msg: string,
    value?: string,
    prompt?: string
) {
    let result = await window.showInputBox(<InputBoxOptions>{
        title: msg,
        value: value,
        prompt: prompt,
        ignoreFocusOut: true,
    });

    if(result === undefined) {
        return "";
    }
    return result;
}