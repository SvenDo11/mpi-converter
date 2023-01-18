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
      // window.showInformationMessage(`Focus ${++i}: ${item}`)
    },
  });
  if (result !== undefined) {
    // check for string validity
    if (yesStrings.includes(result)) {
      window.showInformationMessage("returning true");
      return true;
    }
    return false;
  }
}