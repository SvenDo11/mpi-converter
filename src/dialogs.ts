import {
    window,
    QuickPickOptions,

} from "vscode";

const yesStrings = ["yes", "ja", "y", "1"];

export async function confirmationDialog(msg: string) {
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
  }
}