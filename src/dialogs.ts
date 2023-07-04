import { window, QuickPickOptions, workspace, InputBoxOptions} from "vscode";
import { deflateSync } from "zlib";

const conv = workspace.getConfiguration("mpiconv");

export async function confirmationDialog(msg: string, value?: string) {
    let yesStrings = conv.get<string[]>("confirmationstrings") || ["yes", "y"];
    let noStrings = conv.get<string[]>("decliningstrings") || ["no", "n"];

    let i = 0;
    let result = await window.showQuickPick(["yes", "no"], <QuickPickOptions>{
        title: msg,
        placeHolder: "yes",
        prompt: value,
        onDidSelectItem: (item) => {},
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
    let dialog = window.createInputBox();
    dialog.value = value || "";
    dialog.prompt = prompt || "";

    dialog.title = msg;

    dialog.show();
    dialog.ignoreFocusOut = true;
    await new Promise<void>((resolve, reject) => {
        dialog.onDidAccept(() => resolve());
    });
    let result = dialog.value;
    dialog.dispose();
    return result;
}