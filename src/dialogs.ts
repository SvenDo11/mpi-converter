import {
    window,
    QuickPickOptions,
    workspace,
    InputBoxOptions,
} from "vscode";

const conv = workspace.getConfiguration('mpiconv')

export async function confirmationDialog(msg: string) {
  let yesStrings = conv.get<string[]>('confirmationstrings') || ['yes', 'y'];
  let noStrings = conv.get<string[]>('decliningstrings') || ['no', 'n'];

  let i = 0;
  let result = await window.showQuickPick(["yes", "no"], <QuickPickOptions>{
    title: msg,
    placeHolder: "yes",
    onDidSelectItem: (item) => {
    },
  });
  if (result !== undefined) {
    if (yesStrings.includes(result)) {
      return true;
    }
    return false;
    // TODO: handle neither yes nor no as answer
  }
}

export async function inputDialog(msg: string, value?: string, prompt?: string) {
  let result = await window.showInputBox(<InputBoxOptions>{
    title: msg,
    value: value,
    prompt: prompt
  });
  return result;
}