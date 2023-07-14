import { errorMonitor } from "events";
import { send } from "process";
import { runInThisContext } from "vm";
import * as fs from "fs";
import * as path from "path";
import {
    Event,
    EventEmitter,
    Position,
    TreeView,
    TreeItem,
    TreeDataProvider,
    ProviderResult,
    window,
    TreeItemCollapsibleState,
    TextEdit,
    TextEditor,
} from "vscode";
import { findStringInDocument } from "./util";

export class MPIStatementProvider implements TreeDataProvider<MPITreeItem> {
    getTreeItem(element: MPITreeItem): MPITreeItem | Thenable<MPITreeItem> {
        return element;
    }

    getChildren(element?: MPITreeItem): ProviderResult<MPITreeItem[]> {
        if (element) {
            return Promise.resolve(this.getStatements(element));
        } else {
            return Promise.resolve(this.getFiles());
        }
    }

    getFiles(): MPITreeItem[] {
        let items: MPITreeItem[] = [];
        let textEditors = window.visibleTextEditors;
        for (let editor of textEditors) {
            let file = editor.document.fileName;
            let filepath = path.parse(file);
            let label = filepath.name + filepath.ext;
            items.push(new MPITreeItem(label, undefined, editor));
        }
        return items;
    }

    getStatements(file: MPITreeItem): MPITreeItem[] {
        if (!file.isFile()) {
            return [];
        }

        let activeEditor = file.getEditor();
        if (activeEditor === undefined) {
            return [];
        }

        // TODO: check for MPI files only
        let sendPos = findStringInDocument(activeEditor, "MPI_Send");
        let recvPos = findStringInDocument(activeEditor, "MPI_Recv");
        let items: MPITreeItem[] = [];

        for (let pos of sendPos) {
            items.push(new MPITreeItem("MPI_Send Line " + (pos.line + 1), pos));
        }
        for (let pos of recvPos) {
            items.push(new MPITreeItem("MPI_Recv Line " + (pos.line + 1), pos));
        }
        items.sort((a, b) => {
            return a.getPosition().line - b.getPosition().line;
        });
        return items;
    }

    private _onDidChangeTreeData: EventEmitter<
        MPITreeItem | undefined | null | void
    > = new EventEmitter<MPITreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: Event<MPITreeItem | undefined | null | void> =
        this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}

class MPITreeItem extends TreeItem {
    private _isFile: boolean;
    private pos: Position | undefined;
    private editor: TextEditor | undefined;

    constructor(
        public readonly label: string,
        pos?: Position,
        editor?: TextEditor
    ) {
        super(
            label,
            pos === undefined
                ? TreeItemCollapsibleState.Expanded
                : TreeItemCollapsibleState.None
        );
        this._isFile = pos === undefined;
        this.pos = pos;
        this.editor = editor;
    }

    getPosition(): Position {
        if (this.pos === undefined) {
            throw new Error("Can not return the position of a file!");
        }
        return this.pos;
    }

    getEditor(): TextEditor {
        if (this.editor === undefined) {
            throw new Error("Can not return the editor of a statement!");
        }
        return this.editor;
    }

    isFile(): boolean {
        return this._isFile;
    }
}
